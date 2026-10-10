// Import required modules from LangChain ecosystem
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai" // For creating vector embeddings from text using Gemini
import { ChatGoogleGenerativeAI } from "@langchain/google-genai" // Google's Gemini AI model
import { ChatOpenAI } from "@langchain/openai" // OpenAI-compatible client (used for Together AI fallback)
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages" // Message types for conversations
import {
  ChatPromptTemplate,      // For creating structured prompts with placeholders
  MessagesPlaceholder,     // Placeholder for dynamic message history
} from "@langchain/core/prompts"
import { StateGraph } from "@langchain/langgraph"              // State-based workflow orchestration
import { Annotation } from "@langchain/langgraph"              // Type annotations for state management
import { tool } from "@langchain/core/tools"                   // For creating custom tools/functions
import { ToolNode } from "@langchain/langgraph/prebuilt"       // Pre-built node for executing tools
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb" // For saving conversation state
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"   // Vector search integration with MongoDB
import { MongoClient } from "mongodb"                          // MongoDB database client
import { z } from "zod"                                        // Schema validation library
import "dotenv/config"                                         // Load environment variables from .env file

// Helper to check if an error is a rate limit / quota exhaustion
export function isRateLimitError(error: any): boolean {
  if (!error) return false
  const status = error?.status || error?.statusCode || error?.response?.status || error?.error?.code
  if (status === 429 || status === 503) return true
  const msg = String(error?.message || '').toLowerCase()
  return (
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource_exhausted') ||
    msg.includes('resource has been exhausted') ||
    msg.includes('overloaded') ||
    msg.includes('too many requests')
  )
}

// Main function that creates and runs the AI agent
export async function callAgent(client: MongoClient, query: string, thread_id: string) {
  try {
    // Database configuration
    const dbName = "inventory_database"        // Name of the MongoDB database
    const db = client.db(dbName)              // Get database instance
    const collection = db.collection("items") // Get the 'items' collection

    // Define the state structure for the agent workflow
    const GraphState = Annotation.Root({
      messages: Annotation<BaseMessage[]>({
        // Reducer function: how to combine old and new messages
        reducer: (x, y) => x.concat(y), // Simply concatenate old messages (x) with new messages (y)
      }),
    })

    // Define schema for inventory search tool
    const itemLookupSchema = z.object({
      query: z.string().describe("The search query"),
      n: z.number().optional().default(5)
        .describe("Number of results to return"),
    })

    // Create a custom tool for searching furniture inventory
    const itemLookupTool = tool(
      // The actual function that will be executed when tool is called
      async ({ query, n = 10 }: { query: string; n?: number }) => {
        try {
          console.log("Item lookup tool called with query:", query)

          // Check if database has any data at all
          const totalCount = await collection.countDocuments()
          console.log(`Total documents in collection: ${totalCount}`)

          // Early return if database is empty
          if (totalCount === 0) {
            console.log("Collection is empty")
            return JSON.stringify({ 
              error: "No items found in inventory", 
              message: "The inventory database appears to be empty",
              count: 0 
            })
          }


          // Configuration for MongoDB Atlas Vector Search
          const dbConfig = {
            collection: collection,           // MongoDB collection to search
            indexName: "vector_index",       // Name of the vector search index
            textKey: "embedding_text",       // Field containing the text used for embeddings
            embeddingKey: "embedding",       // Field containing the vector embeddings
          }

          // Create vector store instance for semantic search using Google Gemini embeddings
          const vectorStore = new MongoDBAtlasVectorSearch(
            new GoogleGenerativeAIEmbeddings({
              apiKey: process.env.GOOGLE_API_KEY,
              model: "gemini-embedding-001",
            }),
            dbConfig
          )

          console.log("Performing vector search...")
          // Perform semantic search using vector embeddings
          const result = await vectorStore.similaritySearchWithScore(query, n)
          console.log(`Vector search returned ${result.length} results`)
          
          // If vector search returns no results, fall back to text search
          if (result.length === 0) {
            console.log("Vector search returned no results, trying text search...")
            // MongoDB text search using regular expressions
            const textResults = await collection.find({
              $or: [ // OR condition - match any of these fields
                { item_name: { $regex: query, $options: 'i' } },        // Case-insensitive search in item name
                { item_description: { $regex: query, $options: 'i' } }, // Case-insensitive search in description
                { categories: { $regex: query, $options: 'i' } },       // Case-insensitive search in categories
                { embedding_text: { $regex: query, $options: 'i' } }    // Case-insensitive search in embedding text
              ]
            }).limit(n).toArray() // Limit results and convert to array
            
            console.log(`Text search returned ${textResults.length} results`)
            const formatRating = (reviews: any[]) => {
              if (!Array.isArray(reviews) || reviews.length === 0) return "★★★★★ (5/5)"
              const avg = reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length
              const rounded = Math.round(avg * 2) / 2
              const full = Math.floor(rounded)
              const hasHalf = (rounded - full) >= 0.5
              const stars = '★'.repeat(full) + (hasHalf ? '⯨' : '') + '☆'.repeat(Math.max(0, 5 - full - (hasHalf ? 1 : 0)))
              return `${stars} (${rounded}/5)`
            }

            const formattedTextResults = textResults.map((doc: any) => {
              const fullPrice = doc.prices?.full_price
              const salePrice = doc.prices?.sale_price
              const isDiscounted = typeof salePrice === 'number' && typeof fullPrice === 'number' && salePrice < fullPrice
              const priceDisplay = isDiscounted
                ? `<del class="price-cut">$${Number(fullPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</del> **$${Number(salePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD**`
                : `**$${Number(fullPrice || salePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD**`

              return {
                item_id: doc.item_id,
                item_name: doc.item_name,
                brand: doc.brand,
                item_description: doc.item_description,
                image_url: doc.image_url,
                prices: doc.prices,
                exact_price_display: priceDisplay,
                exact_rating_display: formatRating(doc.user_reviews),
                categories: doc.categories,
                user_reviews: doc.user_reviews,
                notes: doc.notes,
              }
            })

            // Return text search results as JSON string
            return JSON.stringify({
              results: formattedTextResults,
              searchType: "text",    // Indicate this was a text search
              query: query,
              count: formattedTextResults.length
            })
          }

          // Return vector search results with clean metadata including image_url and exact price formatting
          const items = result.map(([doc, score]) => {
            const m = doc.metadata || {}
            const fullPrice = m.prices?.full_price
            const salePrice = m.prices?.sale_price
            const isDiscounted = typeof salePrice === 'number' && typeof fullPrice === 'number' && salePrice < fullPrice
            const priceDisplay = isDiscounted
              ? `<del class="price-cut">$${Number(fullPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</del> **$${Number(salePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD**`
              : `**$${Number(fullPrice || salePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD**`

            const formatRating = (reviews: any[]) => {
              if (!Array.isArray(reviews) || reviews.length === 0) return "★★★★★ (5/5)"
              const avg = reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length
              const rounded = Math.round(avg * 2) / 2
              const full = Math.floor(rounded)
              const hasHalf = (rounded - full) >= 0.5
              const stars = '★'.repeat(full) + (hasHalf ? '⯨' : '') + '☆'.repeat(Math.max(0, 5 - full - (hasHalf ? 1 : 0)))
              return `${stars} (${rounded}/5)`
            }

            return {
              item_id: m.item_id,
              item_name: m.item_name,
              brand: m.brand,
              item_description: m.item_description,
              image_url: m.image_url,
              prices: m.prices,
              exact_price_display: priceDisplay,
              exact_rating_display: formatRating(m.user_reviews),
              categories: m.categories,
              user_reviews: m.user_reviews,
              notes: m.notes,
              score: score,
            }
          })

          return JSON.stringify({
            results: items,
            searchType: "vector",
            query: query,
            count: items.length
          })
          
        } catch (error: any) {
          // Log detailed error information for debugging
          console.error("Error in item lookup:", error)
          console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
          })
          
          return JSON.stringify({ 
            error: "Failed to search inventory", 
            details: error.message,
            query: query
          })
        }
      },
      // Tool metadata and schema definition
      {
        name: "item_lookup",
        description: "Gathers furniture item details from the Inventory database",
        schema: itemLookupSchema,
      }
    )

    // Array of all available tools
    const tools = [itemLookupTool]
    const toolNode = new ToolNode<typeof GraphState.State>(tools)
    // Initialize the primary AI model (Gemini)
    const primaryModel = new ChatGoogleGenerativeAI({
      model: "gemini-flash-lite-latest",
      temperature: 0.2,
      maxRetries: 0,
      apiKey: process.env.GOOGLE_API_KEY,
    }).bindTools(tools)

    // Fallback model via Groq (OpenAI-compatible API)
    // Used automatically when Gemini hits rate limits (429) or quota errors
    const fallbackModel = process.env.GROQ_API_KEY
      ? new ChatOpenAI({
          model: "openai/gpt-oss-120b", // GPT OSS 120B via Groq
          temperature: 0.2,
          maxRetries: 0,
          apiKey: process.env.GROQ_API_KEY,
          configuration: {
            baseURL: "https://api.groq.com/openai/v1",
          },
        }).bindTools(tools)
      : null

    // Decision function
    function shouldContinue(state: typeof GraphState.State) {
      const messages = state.messages
      const lastMessage = messages[messages.length - 1] as AIMessage

      if (lastMessage.tool_calls?.length) {
        return "tools"
      }
      return "__end__"
    }

    // Shared system prompt for both primary and fallback models
    const buildPrompt = () => ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are ShopSmart's friendly and knowledgeable AI shopping assistant for our premium furniture store.

CRITICAL INSTRUCTIONS FOR PRODUCT RECOMMENDATIONS:
When the customer asks about products or when you find items using item_lookup:
1. Always recommend the most relevant items (up to 2 or 3 items max per response for clarity).
2. For EVERY recommended item, you MUST include:
   - **Product Name** as a heading: ### [Item Name]
   - The product image in Markdown: ![Item Name](image_url) (ALWAYS use the exact image_url from the tool result!)
   - **Brand**: e.g., *By LuxeLiving*
   - **Price**: You MUST copy the exact string from the tool's exact_price_display field. NEVER use tildes (~)! Do NOT write ~~$XX~~. It should show a clean price cut like <del class="price-cut">$489.00</del> **$399.50 USD** or regular price **$1,450.00 USD**.
   - **Customer Rating**: You MUST use the rating from the tool's exact_rating_display field (e.g. ★★★★⯨ (4.5/5)). NEVER write the fraction "1/2" or "½"! Use the star symbol with the half-star symbol ⯨ instead! Include a brief quote from the reviews.
   - **Availability**: "In Stock & Ready to Ship"
3. Use clean Markdown formatting with clear line breaks between sections. Never output raw unformatted dumps.
4. Keep the tone helpful, modern, and enthusiastic. End with a friendly question asking if they would like more details, dimensions, or help checking out.

Current time: {time}`,
      ],
      new MessagesPlaceholder("messages"),
    ])

    // Function that calls the AI model with fallback to Groq (openai/gpt-oss-120b) on rate limits
    async function callModel(state: typeof GraphState.State) {
      const prompt = buildPrompt()
      const formattedPrompt = await prompt.formatMessages({
        time: new Date().toISOString(),
        messages: state.messages,
      })

      // Try primary Gemini model first
      try {
        const result = await primaryModel.invoke(formattedPrompt)
        return { messages: [result] }
      } catch (primaryError: any) {
        // If rate limited or quota exceeded, switch to Groq fallback
        if (isRateLimitError(primaryError) && fallbackModel) {
          console.log(`Gemini rate limited (${primaryError?.status || primaryError?.message}). Switching to Groq fallback (openai/gpt-oss-120b)...`)
          try {
            const result = await fallbackModel.invoke(formattedPrompt)
            return { messages: [result] }
          } catch (fallbackError: any) {
            console.error("Groq fallback also failed:", fallbackError?.message)
            throw fallbackError
          }
        }
        // Non-rate-limit error or no fallback configured — rethrow
        throw primaryError
      }
    }

    // Build the workflow graph
    const workflow = new StateGraph(GraphState)
      .addNode("agent", callModel)                    // Add AI model node
      .addNode("tools", toolNode)                     // Add tool execution node
      .addEdge("__start__", "agent")                  // Start workflow at agent
      .addConditionalEdges("agent", shouldContinue)   // Agent decides: tools or end
      .addEdge("tools", "agent")                      // After tools, go back to agent

    // Initialize conversation state persistence
    const checkpointer = new MongoDBSaver({ client, dbName })
    // Compile the workflow with state saving
    const app = workflow.compile({ checkpointer })

    // Execute the workflow
    const finalState = await app.invoke(
      {
        messages: [new HumanMessage(query)], // Start with user's question
      },
      { 
        recursionLimit: 15,                   // Prevent infinite loops
        configurable: { thread_id: thread_id } // Conversation thread identifier
      }
    )

    // Extract the final response from the conversation
    const lastMsgContent = finalState.messages[finalState.messages.length - 1].content
    let response = ""
    if (typeof lastMsgContent === "string") {
      response = lastMsgContent
    } else if (Array.isArray(lastMsgContent)) {
      response = lastMsgContent
        .map((part: any) => (typeof part === "string" ? part : part?.text || ""))
        .join("")
    } else {
      response = String(lastMsgContent || "")
    }

    console.log("Agent response:", response)
    return response

  } catch (error: any) {
    // Handle different types of errors with user-friendly messages
    console.error("Error in callAgent:", error.message)
    
    if (error.status === 429) { // Rate limit error
      throw new Error("Service temporarily unavailable due to rate limits. Please try again in a minute.")
    } else if (error.status === 401) { // Authentication error
      throw new Error("Authentication failed. Please check your API configuration.")
    } else { // Generic error
      throw new Error(`Agent failed: ${error.message}`)
    }
  }
}
