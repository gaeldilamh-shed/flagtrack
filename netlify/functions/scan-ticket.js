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

  const systemPrompt = `You are an OCR extractor for automotive repair-shop tickets, specifically Firestone Complete Auto Care work orders and similar formats.

Read the ticket image and return a JSON object with the following EXACT structure:

{
  "work_order": "string (the work order or repair order number, e.g. '195388')",
  "ticket_date": "string (YYYY-MM-DD format, use the 'In' date or top date)",
  "store_number": "string (if visible, e.g. '352041')",
  "customer_name": "string (customer name)",
  "vehicle": {
    "year": "string (4-digit year)",
    "make": "string (manufacturer)",
    "model": "string (model name)",
    "engine": "string (engine description, e.g. '2.5L L4 Turbo')",
    "vin": "string (full VIN if visible)",
    "license": "string (license plate if visible)"
  },
  "line_items": [
    {
      "description": "string (the service or part name as printed)",
      "quantity": number (default 1),
      "labor_dollars": number or null (labor $ if shown),
      "labor_hours": number or null (flag hours if directly shown),
      "is_labor": boolean (true if this is a labor line, false if just a part)
    }
  ]
}

IMPORTANT RULES:
1. Only include line items that represent actual SERVICES or LABOR performed. Skip pure parts lines, discounts, fees, and "no-charge" items unless they have labor hours.
2. For Firestone tickets: labor is often shown in the "Labor" column as DOLLARS, not hours. Capture that as labor_dollars.
3. If a line says "N/C" or "Courtesy Check" with 0 labor, still include it with labor_hours: 0.
4. Return ONLY the JSON object. No commentary, no markdown fences, no preamble.
5. If a field is not visible, use empty string "" or null. Never invent values.`

  try {
    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'text', text: 'Extract the ticket data as JSON.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
          ]}
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500,
        temperature: 0.1,
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

    // Filter to labor-relevant items and normalize for the front-end
    const filtered = (parsed.line_items || []).filter(li => {
      // Keep if it's a labor line, has labor_hours, or has labor_dollars
      return li.is_labor || li.labor_hours || li.labor_dollars
    })

    const result = {
      work_order: parsed.work_order || '',
      ticket_date: parsed.ticket_date || new Date().toISOString().slice(0, 10),
      store_number: parsed.store_number || '',
      customer_name: parsed.customer_name || '',
      vehicle: parsed.vehicle || {},
      line_items: filtered.map(li => ({
        description: li.description,
        quantity: li.quantity || 1,
        flag_hours_per_unit: li.labor_hours || 0, // library lookup will fill if 0
        labor_dollars: li.labor_dollars || null,
      })),
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
