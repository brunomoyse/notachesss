import { defineEventHandler, readMultipartFormData } from 'h3'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)
    const file = form?.find(f => f.name === 'file')
    if (!file) {
      return {
        data: {
          error: true,
          message: 'No file provided',
          id: null,
          rows: [],
          issues: [],
          metadata: null
        }
      }
    }

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      //model: 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: file.type ?? 'image/jpeg',
                data: file.data.toString('base64')
              }
            },
            {
              type: 'text',
              text: `
SYSTEM / INSTRUCTION

You are extracting chess moves from a photo of a tournament scoresheet.
Return only a JSON array of objects with this exact shape:
[
  {"n":1,"w":"e4","b":"c6"},
  {"n":2,"w":"d4","b":"d5"}
]

No code fences, no prose, no trailing commas.

What the image contains
 - A table with two blocks of three columns:
 - Left block rows 1–20: № | WHITE | BLACK
 - Right block rows 21–40: № | WHITE | BLACK
 - Ignore headers, names, dates, stamps, and anything outside the table.

Output rules
 1. Produce one object per detected row in numeric order (n), up to 40.
 - If a side is blank/illegible, set that field to "" (empty string).
 2. Moves must be in standard English SAN (reference):
 - Pieces: K,Q,R,B,N; pawns have no letter (e.g., e4).
 - Captures: x (e.g., Nxe5).
 - Castling: O-O or O-O-O (normalize 0-0/0-0-0 to letters O-O).
 - Checks +, mate #, promotions =Q/R/B/N (e.g., e8=Q).
 - Disambiguation allowed: Ngf3, N1f3, Rae1, etc.
 3. Normalization
 - Strip extra spaces/punctuation; normalize dashes to -.
 - Common fixes: 0-0→O-O, 0-0-0→O-O-O, l→1 only when it resolves a square/file.
 4. Legality preference
 - If handwriting is unclear, choose the closest legal SAN consistent with the game so far (e.g., prefer bxc6 over impossible Qxc6).
 - If no reasonable legal choice exists, use "" for that side.

Return format
 - Only the JSON array of { "n": number, "w": string, "b": string }.
 - No wrapper object, no comments, no explanations.
                `
            }
          ]
        }
      ]
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''

    // Parse the clean JSON array directly
    let rows: Array<{ n: number; w: string; b: string }> = []
    try {
      rows = JSON.parse(raw)
      if (!Array.isArray(rows)) {
        throw new Error('Response is not an array')
      }
    } catch (error) {
      console.error('Failed to parse OCR response:', error)
      return {
        data: {
          error: true,
          message: 'Failed to parse OCR result',
          id: null,
          rows: [],
          issues: [],
          metadata: null
        }
      }
    }

    // No auto-save to database - just return the parsed rows
    return {
      data: {
        id: null, // No auto-save
        rows,
        issues: [], // Issues will be handled by frontend validation
        metadata: {
          name: `OCR Game ${new Date().toLocaleDateString()}`,
          white: 'Player 1',
          black: 'Player 2'
        }
      }
    }
  } catch (error: any) {
    console.error('OCR processing error:', error)
    return {
      data: {
        error: true,
        message: error.message || 'Failed to process image',
        id: null,
        rows: [],
        issues: [],
        metadata: null
      }
    }
  }
})