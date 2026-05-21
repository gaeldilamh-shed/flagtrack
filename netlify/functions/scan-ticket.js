// Netlify Function: /.netlify/functions/scan-ticket
// Calls OpenAI Vision API to extract structured ticket data from an image.
// Requires environment variable: OPENAI_API_KEY

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

  const systemPrompt = `You are an expert at reading automotive flat-rate repair tickets the way a TECHNICIAN reads them - especially Firestone Complete Auto Care work orders. Technicians get paid by "flag hours" (FRH = Flat Rate Hours).

=== HOW A TECH READS A TICKET ===
A ticket is verbose. One real SERVICE often sprawls across 3-5 printed lines (a bold package header, indented sub-descriptions, part numbers, fees). A tech mentally COLLAPSES all of that into a SHORT name of 1-3 words.

Example: the block
   "TOYO TIRE PACKAGE / 2 YEAR ROAD HAZARD / US ETA 5-18 / MARYLAND TIRE FEE / NEW TIRE WHEEL BALANCE LABOR / TPMS VALVE SERVICE KIT / 6-225 TPMS KIT / SCRAP TIRE RECYCLING FEE"
to a tech is just => "Tire Service".

=== HOW TO FIND THE SERVICES (boundaries) ===
The line-item table columns are: Description | Article# | ID | FRH Hours | Qty | Part | Labor

Use these signals, in priority order, to find where each distinct SERVICE starts:
1. FRH HOURS column: a number in the FRH column (like 0.1, 0.3, 0.6, 1.0) is the STRONGEST signal of a billable service. Each FRH value = one service the tech earned. This is the anchor.
2. LABOR DOLLARS column: if there is NO FRH but there is a dollar amount in the Labor column, that dollar line is also a service boundary.
3. SECTION HEADERS: bold/standalone headers (e.g. "COURTESY CHECK", "FREE ALIGNMENT CHECK", "TIRE ROTATION - WARRANTY N/C") name a service even when amounts are small or N/C.

CRITICAL RULES:
- "N/C" (no charge) in the Labor column means the CUSTOMER isn't billed, but the TECH STILL EARNS the FRH hours. NEVER skip an N/C line that has FRH hours or is a clear service header.
- Roll up surrounding description noise (part numbers, fees, sub-lines) INTO the service they belong to. Do NOT list fees, part numbers, recycling charges, road-hazard, or discounts as their own services.
- Give each service a SHORT tech-style name: "Tire Service", "Tire Install", "Wheel Balance", "Alignment Check", "Courtesy Check", "Tire Rotation", "Oil Change", "Front Brakes", "Battery", "Diagnostic", etc.
- Capture EVERY distinct service. It is much worse to MISS a service than to include an extra one. When unsure whether something is its own service, include it.

=== FLAG HOURS PER SERVICE ===
- If the service has an FRH value, report it in "flag_hours".
- If the service has NO FRH but HAS a labor dollar amount, set "flag_hours" to null and put the amount in "labor_dollars" (the app will propose hours from the user's library).
- If neither, set both null (the app will propose or ask).

Return ONLY a JSON object (no markdown, no commentary):

{
  "work_order": "string (Work Order number, usually top-left)",
  "ticket_date": "string YYYY-MM-DD (use the IN date)",
  "store_number": "string",
  "customer_name": "string",
  "page_info": "string (e.g. 'Page 1 of 2' if visible, else '')",
  "vehicle": {
    "year": "string", "make": "string", "model": "string",
    "engine": "string", "vin": "string", "license": "string"
  },
  "services": [
    {
      "name": "string (SHORT tech name, 1-3 words)",
      "raw_text": "string (the original ticket text you rolled up, for reference)",
      "flag_hours": number or null,
      "quantity": number (default 1),
      "labor_dollars": number or null,
      "customer_charge": "string (N/C or $ amount, reference only)"
    }
  ]
}

WORKED EXAMPLE (real Firestone tire ticket):
Services found:
- "Tire Service" (rolls up Toyo package, wheel balance labor, tpms kit) flag_hours: 0.3
- "Tire Install" flag_hours: 0.6
- "Alignment Check" (FREE WHEEL ALIGNMENT CHECK, Labor N/C) flag_hours: 0.6  <- INCLUDE, N/C still pays
- "Courtesy Check" (Labor N/C) flag_hours: 0.1  <- INCLUDE
- "Tire Rotation" (WARRANTY N/C) flag_hours: 0.1  <- INCLUDE
=> 5 services, 1.7 flag hours total. Excluded: Maryland Tire Fee, TPMS part, Road Hazard, Scrap fee, Price Match discount.

If a field is not visible, use "" or null. Never invent values.`

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
            { type: 'text', text: 'Read this ticket like a technician. Collapse verbose blocks into short service names. Capture EVERY service that pays flag hours, including N/C lines with FRH. Return JSON.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
          ]}
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2500,
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
    if (!content) {
      return { statusCode: 500, body: 'No content in OpenAI response' }
    }

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      return { statusCode: 500, body: 'OpenAI returned non-JSON: ' + content.slice(0, 200) }
    }

    // Accept both "services" (new) and "line_items" (legacy) keys
    const rawServices = parsed.services || parsed.line_items || []

    // Keep services that have flag hours OR labor dollars OR look like a named service.
    // We are deliberately permissive: missing a service is worse than an extra one.
    const services = rawServices
      .filter(s => {
        const name = (s.name || s.description || '').trim()
        if (!name) return false
        // Drop obvious non-services even if model included them
        const lower = name.toLowerCase()
        const junk = ['maryland tire fee', 'scrap tire', 'recycling fee', 'road hazard protection',
                      'price match', 'prt-disc', 'tire fee', 'shop supplies', 'disposal fee']
        if (junk.some(j => lower.includes(j))) {
          // only drop if it has no flag hours of its own
          const fh = parseFloat(s.flag_hours)
          if (!fh || fh <= 0) return false
        }
        return true
      })
      .map(s => ({
        name: s.name || s.description || 'Service',
        raw_text: s.raw_text || '',
        quantity: s.quantity || 1,
        flag_hours: (s.flag_hours === null || s.flag_hours === undefined) ? null : parseFloat(s.flag_hours),
        labor_dollars: (s.labor_dollars === null || s.labor_dollars === undefined) ? null : parseFloat(s.labor_dollars),
        customer_charge: s.customer_charge || null,
      }))

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
