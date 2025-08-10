import { H3Error } from 'h3'
import { z } from 'zod'

// validation schema for form data
const receiptFileSchema = z.object({
  name: z.literal('receipt'),
  filename: z.string().min(1, 'Filename is required'),
  type: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'], {
    error: 'Only image files are allowed (JPEG, PNG, WebP)'
  }),
  data: z
    .instanceof(Buffer)
    .refine((buffer) => buffer.length > 0, 'File cannot be empty')
    .refine(
      (buffer) => buffer.length <= 10 * 1024 * 1024, // Max file size 10MB
      'File size cannot exceed 10MB'
    )
})

export default defineEventHandler(async (event) => {
  try {
    // read the multipart form data
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Missing form data'
      })
    }

    // get the receipt file in the form data
    const receiptFile = formData.find((item) => item.name === 'receipt')
    if (!receiptFile || !receiptFile.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Missing receipt file'
      })
    }

    // validate the receipt file
    const validation = receiptFileSchema.safeParse(receiptFile)
    if (!validation.success) {
      console.log('validation error', validation.error.issues)
      const errorMessage = validation.error.issues[0].message
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: errorMessage
      })
    }

    // convert the file buffer to base64
    const base64Image = receiptFile.data.toString('base64')
    const mimeType = receiptFile.type || 'image/jpeg'

    const systemPrompt = `
    You are a helpful assistant that act as a split bill assistant.

    You will be given an image of a receipt and need to extract all the items with their quantities and prices.
    Parse the receipt image and identify:
    1. All individual items with their names
    2. The quantity of each items (if available)
    3. The price of each items
    4. The total amount of the bill
    `

    // send completion request
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
          model: process.env.COMPLETION_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please parse this receipt image and extract all items with the quantities and prices.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'items_schema',
              schema: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    description: 'The list of items',
                    items: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          description: 'The name of the item'
                        },
                        quantity: {
                          type: 'number',
                          description: 'The quantity of the item'
                        },
                        price: {
                          type: 'number',
                          description: 'The price of the item'
                        }
                      },
                      required: ['name', 'quantity', 'price']
                    }
                  },
                  total: {
                    type: 'number',
                    description: 'The total amount of the bill'
                  }
                },
                required: ['items', 'total']
              }
            }
          }
        })
      }
    )

    // parse the completion response
    const completion = await response.json()
    console.log('completion response', JSON.stringify(completion, null, 2))
    const receipt = JSON.parse(completion.choices[0].message.content)

    return {
      message: 'OK',
      data: {
        receipt
      }
    }
  } catch (error) {
    console.error('error POST /api/parse', error)
    // handle error
    if (error instanceof H3Error) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.statusMessage,
        message: error.message
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Internal server error'
    })
  }
})
