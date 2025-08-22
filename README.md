# SplitBill

AI-powered bill splitter: Snap receipts, assign items with drag-&-drop, get instant fair splits.

## Features

- **AI-Powered Receipt Scanning**: Upload a receipt image and let AI extract items, quantities, and prices automatically.
- **Easy Participant Management**: Add multiple participants to a bill.
- **Simple Item Assignment**: Assign each item to one or more people with a simple click.
- **Instant & Accurate Calculations**: Get a real-time breakdown of who owes what.
- **Responsive Design**: Fully functional on both desktop and mobile devices.

## Getting Started

### Set up environment variables

Create a `.env` file in the root of the project and add the following environment variables.

1. You'll need an API key from [OpenRouter](https://openrouter.ai/)
2. Completion model that support [image input and structured output](https://openrouter.ai/models?fmt=cards&input_modalities=image&supported_parameters=structured_outputs)

```env
OPENROUTER_API_KEY=your_openrouter_api_key
COMPLETION_MODEL=qwen/qwen2.5-vl-72b-instruct:free
```

### Install dependencies

```bash
npm install
```

### Run the development server

Start the development server on `http://localhost:3000`.

```bash
npm run dev
```
