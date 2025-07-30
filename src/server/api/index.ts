export default defineEventHandler(async () => {
  return {
    message: 'OK',
    data: {
      date: new Date().toISOString()
    }
  }
})
