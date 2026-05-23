// Netlify Function: /.netlify/functions/scan-ticket
// Reads a Firestone-style work order with OpenAI Vision, then computes flag
// hours DETERMINISTICALLY in code using the article-number rule:
//   - Only 9-digit article numbers are labor lines that pay flag time.
//   - FRH for a line = first 2 digits of its 9-digit article number, read as tenths
//       e.g. 037008190 -> "03" -> 0.3 ;  057015016 -> "05" -> 0.5
//   - Lines are grouped under their bold SECTION HEADER. All qualifying lines
//     under one header SUM into a single service (e.g. tire package = 0.3 + 0.5 = 0.8).
//   - Quantity is IGNORED entirely (never multiply).
//   - DOT numbers, parts (shorter article numbers), fees, discounts -> ignored.
//   - Some packages are FIXED value regardless of article math (see FIXED_PACKAGES).

const FIXED_PACKAGES = [
  // header keyword (lowercased)  ->  fixed flag hours
  { match: 'car care package', hours: 0.5 },
]

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: 'OPENAI_API_KEY is not configured on the server.' }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  const { image_base64, mime_type } = body
  if (!image_base64) {
    return { statusCode: 400, body: 'Missing image_base64' }
  }

  const dataUrl = `data:${mime_type || 'image/jpeg'};base64,${image_base64}`

  // The AI's job is ONLY to transcribe the ticket faithfully into rows + headers.
  // We do NOT ask it to compute flag hours - code does that deterministically.
  const systemPrompt = `You are a precise OCR transcriber for Firestone Complete Auto Care work orders. Do NOT calculate anything. Just faithfully read the ticket structure.

The line-item table has columns: Description | Article Number | T# | Qty | Part | Labor | Extended Price | Job Total

The rows are organized under BOLD SECTION HEADERS (e.g. "FIRESTONE TIRE PACKAGE", "CAR CARE PACKAGE", "FREE ALIGNMENT CHECK", "COURTESY CHECK"). Indented lines below a header belong to that header.

For EACH row in the line-item area, capture:
- "header": the bold section header this row falls under (carry it down to all rows beneath it until the next bold header)
- "description": the row's description text
- "article_number": the Article Number EXACTLY as printed, including all leading zeros (e.g. "037008190", "007013632", "7009357"). If a row has no article number, use "".
- "printed_frh": ONLY read this from a column literally titled "FRH" or "FRH Hours". This is a small number of hours like 0.1, 0.3, 0.6, 1.0. 
    *** DO NOT use the "Labor" column or any dollar amount. *** The Labor column contains DOLLARS (like 13.99, 3.06, 5.12, 1.00) — these are NOT flag hours. If the only numbers you see for a row are in a Labor/$/Extended/Price column, set printed_frh to null. Many tickets have NO FRH column at all — in that case printed_frh is null for EVERY row.
- "is_handwritten": true if this line is hand-written (like DOT numbers penned in by the tech)

CRITICAL ABOUT FRH vs LABOR DOLLARS:
- A real FRH column is titled "FRH" or "FRH Hours" and contains small hour values (0.1, 0.3, 0.6).
- The "Labor" column contains DOLLAR amounts ($13.99, $3.06). NEVER put those in printed_frh.
- If you are unsure whether a column is FRH or Labor-dollars, set printed_frh to null. It is much safer to return null (the app will decode the article number instead) than to mistake dollars for hours.

IMPORTANT:
- Some tickets HAVE a printed "FRH Hours" column; others do NOT. If you see an FRH/FRH Hours column header, read its values into "printed_frh". If there is no such column, set printed_frh null for every row.
- Preserve leading zeros in article numbers exactly. "007013632" must NOT become "7013632".
- DOT number lines (handwritten codes after tires) -> set is_handwritten true, article_number "".
- Do not skip rows. Capture every printed row, even fees and parts; code will filter them.
- Do not compute or guess flag hours. Just transcribe what is printed.

Return ONLY this JSON:
{
  "work_order": "string (Retail Work Order number)",
  "ticket_date": "string YYYY-MM-DD (the In date)",
  "store_number": "string",
  "customer_name": "string",
  "page_info": "string (e.g. 'Page 1 of 2' if shown, else '')",
  "has_frh_column": true/false (does this ticket have a printed FRH Hours column?),
  "vehicle": { "year":"", "make":"", "model":"", "engine":"", "vin":"", "license":"" },
  "rows": [
    { "header": "FIRESTONE TIRE PACKAGE", "description": "TPMS VALVE SERVICE KIT LABOR", "article_number": "037008190", "printed_frh": null, "is_handwritten": false }
  ]
}

If a field isn't visible use "" or null - never invent.`

  try {
    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'text', text: 'Transcribe this work order into the JSON structure. Preserve every article number exactly with leading zeros. Do not calculate flag hours.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
          ]}
        ],
        response_format: { type: 'json_object' },
        max_tokens: 3000,
        temperature: 0,
      }),
    })

    if (!openaiResp.ok) {
      const err = await openaiResp.text()
      console.error('OpenAI error:', err)
      return { statusCode: 500, body: `OpenAI error: ${err}` }
    }

    const data = await openaiResp.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return { statusCode: 500, body: 'No content in OpenAI response' }

    let parsed
    try { parsed = JSON.parse(content) }
    catch (e) { return { statusCode: 500, body: 'OpenAI returned non-JSON: ' + content.slice(0, 200) } }

    const services = computeServices(parsed.rows || [], parsed.has_frh_column === true)

    const result = {
      work_order: parsed.work_order || '',
      ticket_date: parsed.ticket_date || new Date().toISOString().slice(0, 10),
      store_number: parsed.store_number || '',
      customer_name: parsed.customer_name || '',
      page_info: parsed.page_info || '',
      vehicle: parsed.vehicle || {},
      services,
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, body: 'Server error: ' + e.message }
  }
}

// --- Deterministic flag-hour computation ---

// FRH from a 9-digit article number = first 2 digits as tenths. Else null.
function frhFromArticle(article) {
  if (!article) return null
  const digits = String(article).replace(/\D/g, '')
  if (digits.length !== 9) return null            // only 9-digit numbers are labor lines
  const lead = parseInt(digits.slice(0, 2), 10)   // "03" -> 3, "05" -> 5
  if (isNaN(lead)) return null
  return lead / 10                                 // 3 -> 0.3, 5 -> 0.5, 0 -> 0.0
}

function shortName(header, fallback) {
  const h = (header || '').toLowerCase()
  if (h.includes('tire package')) return 'Tire Service'
  if (h.includes('car care')) return 'Car Care Package'
  if (h.includes('alignment')) return 'Alignment Check'
  if (h.includes('courtesy')) return 'Courtesy Check'
  if (h.includes('oil')) return 'Oil Change'
  if (h.includes('brake')) return 'Brakes'
  if (h.includes('rotation')) return 'Tire Rotation'
  // Title-case the header if we don't have a short alias
  const base = header || fallback || 'Service'
  return base.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function computeServices(rows, hasFrhColumn) {
  // Group rows by their header (carry-down already done by the model, but enforce here)
  const groups = new Map()  // header -> { rows: [] }
  let currentHeader = ''
  for (const r of rows) {
    if (r.header && r.header.trim()) currentHeader = r.header.trim()
    const key = currentHeader || (r.description || 'Service')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }

  const services = []
  for (const [header, groupRows] of groups.entries()) {
    const headerLower = header.toLowerCase()

    // Fixed-value package? (e.g. Car Care Package = 0.5 flat, absorbs all children)
    const fixed = FIXED_PACKAGES.find(f => headerLower.includes(f.match))
    if (fixed) {
      services.push({
        name: shortName(header),
        flag_hours: fixed.hours,
        source: 'fixed',
        confidence: 'high',
      })
      continue
    }

    // PRIORITY 1: printed FRH column. If any row under this header has a printed
    // FRH value, the ticket told us the flag time directly -> trust it, sum those.
    // GUARD: real flag hours are small tenths (0.1-5.0). The AI sometimes mistakes
    // the LABOR DOLLAR column ($13.99, $3.06) for FRH. Reject anything that looks
    // like a dollar amount: > 5.0, or has non-tenth cents (e.g. 13.99, 3.06, 5.12).
    function looksLikeFRH(v) {
      if (v === null || v === undefined) return false
      const n = parseFloat(v)
      if (isNaN(n) || n <= 0) return false
      if (n > 5.0) return false                    // flag times are rarely above 5h; dollars often are
      // FRH values are clean tenths: 0.1, 0.3, 0.6, 1.0, 1.5...
      // Dollar values have cents: 13.99, 3.06, 5.12. Reject if not a clean tenth.
      const tenth = Math.round(n * 10)
      if (Math.abs(n * 10 - tenth) > 0.001) return false   // not a clean tenth -> probably dollars
      return true
    }

    let printedSum = 0
    let printedCount = 0
    const printedParts = []
    // Only trust printed FRH when the AI confirmed the ticket actually HAS an FRH column.
    // Otherwise we fall straight to article-number decoding (avoids Labor-dollar confusion).
    if (hasFrhColumn) {
      for (const r of groupRows) {
        if (r.is_handwritten) continue
        if (!looksLikeFRH(r.printed_frh)) continue
        const pf = parseFloat(r.printed_frh)
        printedSum += pf
        printedCount++
        printedParts.push(`${r.description}: ${pf.toFixed(1)}`)
      }
    }
    if (printedCount > 0) {
      printedSum = Math.round(printedSum * 10) / 10
      services.push({
        name: shortName(header),
        flag_hours: printedSum,
        source: 'printed_frh',
        confidence: 'high',
        breakdown: printedParts.join(' · '),
      })
      continue
    }

    // PRIORITY 2 (fallback): no printed FRH -> decode the article numbers.
    // Sum FRH from all qualifying 9-digit labor lines under this header.
    let sum = 0
    let counted = 0
    const articleParts = []
    for (const r of groupRows) {
      if (r.is_handwritten) continue            // skip DOT etc.
      const frh = frhFromArticle(r.article_number)
      if (frh === null) continue                // not a 9-digit labor line
      if (frh === 0) continue                   // 00-prefixed (fees / bundled) contribute nothing
      sum += frh
      counted++
      articleParts.push(`${r.description}: ${frh.toFixed(1)}`)
    }
    sum = Math.round(sum * 10) / 10
    if (counted > 0 && sum > 0) {
      services.push({
        name: shortName(header),
        flag_hours: sum,
        source: 'article',
        confidence: 'high',
        breakdown: articleParts.join(' · '),
      })
    }
  }

  return services
}
