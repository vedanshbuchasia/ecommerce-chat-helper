// Import Google's Gemini chat model and embeddings for AI text generation and vector creation
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
// Import structured output parser to ensure AI returns data in specific format
import { StructuredOutputParser } from "@langchain/core/output_parsers"
// Import MongoDB client for database connection
import { MongoClient } from "mongodb"
// Import MongoDB Atlas vector search for storing and searching embeddings
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"
// Import Zod for data schema validation and type safety
import { z } from "zod"
// Load environment variables from .env file (API keys, connection strings)
import "dotenv/config"

// Create MongoDB client instance using connection string from environment variables
const client = new MongoClient(process.env.MONGODB_ATLAS_URI as string)

// Initialize Google Gemini chat model for generating synthetic furniture data
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-flash-latest",
  temperature: 0.7,
  apiKey: process.env.GOOGLE_API_KEY,
})

// Define schema for furniture item structure using Zod validation
const itemSchema = z.object({
  item_id: z.string(),                    // Unique identifier for the item
  item_name: z.string(),                  // Name of the furniture item
  item_description: z.string(),           // Detailed description of the item
  brand: z.string(),                      // Brand/manufacturer name
  manufacturer_address: z.object({        // Nested object for manufacturer location
    street: z.string(),                   // Street address
    city: z.string(),                     // City name
    state: z.string(),                    // State/province
    postal_code: z.string(),              // ZIP/postal code
    country: z.string(),                  // Country name
  }),
  prices: z.object({                      // Nested object for pricing information
    full_price: z.number(),               // Regular price
    sale_price: z.number(),               // Discounted price
  }),
  categories: z.array(z.string()),        // Array of category tags
  user_reviews: z.array(                  // Array of customer reviews
    z.object({
      review_date: z.string(),            // Date of review
      rating: z.number(),                 // Numerical rating (1-5)
      comment: z.string(),                // Review text comment
    })
  ),
  notes: z.string(),                      // Additional notes about the item
})

// Create TypeScript type from Zod schema for type safety
type Item = z.infer<typeof itemSchema>

// Create parser that ensures AI output matches our item schema
const parser = StructuredOutputParser.fromZodSchema(z.array(itemSchema))

// Function to create database and collection before seeding
async function setupDatabaseAndCollection(): Promise<void> {
  console.log("Setting up database and collection...")
  
  // Get reference to the inventory_database database
  const db = client.db("inventory_database")
  
  // Create the items collection if it doesn't exist
  const collections = await db.listCollections({ name: "items" }).toArray()
  
  if (collections.length === 0) {
    await db.createCollection("items")
    console.log("Created 'items' collection in 'inventory_database' database")
  } else {
    console.log("'items' collection already exists in 'inventory_database' database")
  }
}

// Function to create vector search index
async function createVectorSearchIndex(): Promise<void> {
  try {
    const db = client.db("inventory_database")
    const collection = db.collection("items")
    await collection.dropIndexes()
    const vectorSearchIdx = {
      name: "vector_index",
      type: "vectorSearch",
      definition: {
        "fields": [
          {
            "type": "vector",
            "path": "embedding",
            "numDimensions": 3072,
            "similarity": "cosine"
          }
        ]
      }
    }
    console.log("Creating vector search index...")
    await collection.createSearchIndex(vectorSearchIdx);

    console.log("Successfully created vector search index");
  } catch (e) {
    console.error('Failed to create vector search index:', e);
  }
}

async function generateSyntheticData(): Promise<Item[]> {
  const fallbackItems: Item[] = [
    {
      item_id: "FURN-001",
      item_name: "Nordic Velvet 3-Seater Sofa",
      item_description: "A mid-century modern 3-seater sofa upholstered in soft, stain-resistant emerald green velvet with tapered solid oak legs.",
      brand: "NordicLiving",
      manufacturer_address: { street: "104 Fjord Way", city: "Oslo", state: "Oslo", postal_code: "0150", country: "Norway" },
      prices: { full_price: 1199, sale_price: 899 },
      categories: ["Living Room", "Sofas", "Velvet", "Mid-Century"],
      user_reviews: [
        { review_date: "2025-01-15", rating: 5, comment: "Extremely comfortable and the emerald green color looks gorgeous in our living room!" },
        { review_date: "2025-02-02", rating: 4, comment: "High quality velvet, easy to assemble legs." }
      ],
      notes: "Cushions are removable and have zip covers for easy spot cleaning."
    },
    {
      item_id: "FURN-002",
      item_name: "Artisan Solid Walnut Dining Table",
      item_description: "Handcrafted 8-person extendable dining table carved from sustainably harvested American black walnut with a satin protective finish.",
      brand: "Heritage Woodcraft",
      manufacturer_address: { street: "500 Timber Road", city: "Portland", state: "OR", postal_code: "97201", country: "USA" },
      prices: { full_price: 1450, sale_price: 1200 },
      categories: ["Dining Room", "Tables", "Solid Wood", "Walnut"],
      user_reviews: [
        { review_date: "2025-01-20", rating: 5, comment: "Stunning craftsmanship. Everyone compliments it at dinner parties." }
      ],
      notes: "Includes 2 extension leaves stored beneath the table surface."
    },
    {
      item_id: "FURN-003",
      item_name: "ErgoComfort Executive Mesh Office Chair",
      item_description: "Ergonomic desk chair featuring 4D adjustable armrests, dynamic lumbar support, breathable Korean mesh, and a smooth pneumatic height cylinder.",
      brand: "ErgoPro",
      manufacturer_address: { street: "88 Tech Boulevard", city: "Seoul", state: "Seoul", postal_code: "04524", country: "South Korea" },
      prices: { full_price: 499, sale_price: 349 },
      categories: ["Office", "Chairs", "Ergonomic"],
      user_reviews: [
        { review_date: "2025-03-10", rating: 5, comment: "Fixed my lower back pain after 8 hours of daily coding." }
      ],
      notes: "BIFMA certified, supports up to 350 lbs."
    },
    {
      item_id: "FURN-004",
      item_name: "Minimalist Floating Bed Frame with Headboard",
      item_description: "Queen size low-profile platform bed with integrated warm LED under-bed ambient lighting and upholstered headboard.",
      brand: "Zenith Home",
      manufacturer_address: { street: "12 Sakura St", city: "Kyoto", state: "Kyoto", postal_code: "600-8001", country: "Japan" },
      prices: { full_price: 850, sale_price: 699 },
      categories: ["Bedroom", "Beds", "Platform", "Modern"],
      user_reviews: [
        { review_date: "2025-02-18", rating: 5, comment: "The floating look with subtle LED glow is futuristic and calming." }
      ],
      notes: "No box spring needed. Heavy-duty birch slat support system."
    },
    {
      item_id: "FURN-005",
      item_name: "Carrara Marble & Brass Coffee Table",
      item_description: "Round 36-inch coffee table topped with authentic polished Italian Carrara marble resting on a brushed geometric brass base.",
      brand: "Luxe Living",
      manufacturer_address: { street: "45 Via Roma", city: "Carrara", state: "Tuscany", postal_code: "54033", country: "Italy" },
      prices: { full_price: 680, sale_price: 520 },
      categories: ["Living Room", "Coffee Tables", "Marble", "Brass"],
      user_reviews: [
        { review_date: "2025-01-29", rating: 4, comment: "Heavy and durable. Marble veining is completely unique." }
      ],
      notes: "Sealed with protective coating against water and wine rings."
    },
    {
      item_id: "FURN-006",
      item_name: "Industrial Metal & Reclaimed Wood Bookshelf",
      item_description: "5-tier open shelving unit constructed with matte black powder-coated steel frame and rustic reclaimed pine shelves.",
      brand: "Urban Loft",
      manufacturer_address: { street: "74 Industrial Ave", city: "Detroit", state: "MI", postal_code: "48201", country: "USA" },
      prices: { full_price: 420, sale_price: 310 },
      categories: ["Living Room", "Office", "Storage", "Bookshelves"],
      user_reviews: [
        { review_date: "2025-02-14", rating: 5, comment: "Holds tons of heavy books without sagging. Beautiful rustic wood grain." }
      ],
      notes: "Includes anti-tip wall mounting hardware."
    },
    {
      item_id: "FURN-007",
      item_name: "Cloud Cushion Sectional Sofa",
      item_description: "Deep-seated modular L-shaped sectional couch filled with down-feather blend cushions and wrapped in high-grade linen fabric.",
      brand: "Haven Furniture",
      manufacturer_address: { street: "220 Coastal Way", city: "San Diego", state: "CA", postal_code: "92101", country: "USA" },
      prices: { full_price: 2400, sale_price: 1899 },
      categories: ["Living Room", "Sofas", "Sectionals", "Linen"],
      user_reviews: [
        { review_date: "2025-03-01", rating: 5, comment: "You literally sink into it. The most relaxing sofa we have ever owned." }
      ],
      notes: "Modular design allows left or right configuration."
    },
    {
      item_id: "FURN-008",
      item_name: "Cast Iron & Teak Outdoor Patio Dining Set",
      item_description: "Weatherproof 6-chair patio dining set featuring Indonesian grade-A teak tabletop and UV-resistant powder-coated aluminum framing.",
      brand: "SunBreeze Outdoor",
      manufacturer_address: { street: "88 Marina Blvd", city: "Denpasar", state: "Bali", postal_code: "80228", country: "Indonesia" },
      prices: { full_price: 1800, sale_price: 1399 },
      categories: ["Outdoor", "Patio", "Teak", "Dining Sets"],
      user_reviews: [
        { review_date: "2025-02-25", rating: 5, comment: "Withstood heavy rain and intense sunlight without fading or warping." }
      ],
      notes: "Naturally pest and moisture resistant teak."
    }
  ]

  try {
    const prompt = `You are a helpful assistant that generates furniture store item data. Generate 8 furniture store items. Each record should include the following fields: item_id, item_name, item_description, brand, manufacturer_address, prices, categories, user_reviews, notes. Ensure variety in the data and realistic values.

  ${parser.getFormatInstructions()}`

    console.log("Generating synthetic data with Gemini...")
    const response = await llm.invoke(prompt)
    const parsed = await parser.parse(response.content as string)
    if (parsed && parsed.length > 0) return parsed
  } catch (error: any) {
    console.log("Gemini synthetic generation skipped/failed, using curated catalog:", error.message || error)
  }

  return fallbackItems
}

// Function to create a searchable text summary from furniture item data
async function createItemSummary(item: Item): Promise<string> {
  // Return Promise for async compatibility (though this function is synchronous)
  return new Promise((resolve) => {
    // Extract manufacturer country information
    const manufacturerDetails = `Made in ${item.manufacturer_address.country}`
    // Join all categories into comma-separated string
    const categories = item.categories.join(", ")
    // Convert user reviews array into readable text format
    const userReviews = item.user_reviews
      .map(
        (review) =>
          `Rated ${review.rating} on ${review.review_date}: ${review.comment}`
      )
      .join(" ")  // Join multiple reviews with spaces
    // Create basic item information string
    const basicInfo = `${item.item_name} ${item.item_description} from the brand ${item.brand}`
    // Format pricing information
    const price = `At full price it costs: ${item.prices.full_price} USD, On sale it costs: ${item.prices.sale_price} USD`
    // Get additional notes
    const notes = item.notes

    // Combine all information into comprehensive summary for vector search
    const summary = `${basicInfo}. Manufacturer: ${manufacturerDetails}. Categories: ${categories}. Reviews: ${userReviews}. Price: ${price}. Notes: ${notes}`

    // Resolve promise with complete summary
    resolve(summary)
  })
}

// Main function to populate database with AI-generated furniture data
async function seedDatabase(): Promise<void> {
  try {
    // Establish connection to MongoDB Atlas
    await client.connect()
    // Ping database to verify connection works
    await client.db("admin").command({ ping: 1 })
    // Log successful connection
    console.log("You successfully connected to MongoDB!")

    // Setup database and collection
    await setupDatabaseAndCollection()
    
    // Create vector search index
    await createVectorSearchIndex()

    // Get reference to specific database
    const db = client.db("inventory_database")
    // Get reference to items collection
    const collection = db.collection("items")

    // Clear existing data from collection (fresh start)
    await collection.deleteMany({})
    console.log("Cleared existing data from items collection")
    
    // Generate new synthetic furniture data using AI
    const syntheticData = await generateSyntheticData()

    // Process each item: create summary and prepare for vector storage
    const recordsWithSummaries = await Promise.all(
      syntheticData.map(async (record) => ({
        pageContent: await createItemSummary(record),  // Create searchable summary
        metadata: {...record},                         // Preserve original item data
      }))
    )
    
    // Store each record with vector embeddings in MongoDB
    for (const record of recordsWithSummaries) {
      // Create vector embeddings and store in MongoDB Atlas using Gemini
      await MongoDBAtlasVectorSearch.fromDocuments(
        [record],                    // Array containing single record
        new GoogleGenerativeAIEmbeddings({
          apiKey: process.env.GOOGLE_API_KEY,
          model: "gemini-embedding-001",
        }),
        {
          collection,                // MongoDB collection reference
          indexName: "vector_index", // Name of vector search index
          textKey: "embedding_text", // Field name for searchable text
          embeddingKey: "embedding", // Field name for vector embeddings
        }
      )

      // Log progress for each successfully processed item
      console.log("Successfully processed & saved record:", record.metadata.item_id)
    }

    // Log completion of entire seeding process
    console.log("Database seeding completed")

  } catch (error) {
    // Log any errors that occur during database seeding
    console.error("Error seeding database:", error)
  } finally {
    // Always close database connection when finished (cleanup)
    await client.close()
  }
}

// Execute the database seeding function and handle any errors
seedDatabase().catch(console.error)
