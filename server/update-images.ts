import 'dotenv/config'
import { MongoClient } from 'mongodb'

const images: Record<string, string> = {
  'FURN-SOF-001': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
  'FURN-TBL-002': 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=600&q=80',
  'FURN-CHR-003': 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80',
  'FURN-BED-004': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80',
  'FURN-BKS-005': 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80',
  'FURN-PAT-006': 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80',
  'FURN-ARM-007': 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80',
  'FURN-COF-008': 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&q=80'
}

async function updateImages() {
  const client = new MongoClient(process.env.MONGODB_ATLAS_URI as string)
  await client.connect()
  const col = client.db('inventory_database').collection('items')
  for (const [id, url] of Object.entries(images)) {
    await col.updateOne({ item_id: id }, { $set: { image_url: url } })
    console.log('Updated image for:', id)
  }
  await client.close()
  console.log('Successfully updated all product image URLs!')
}

updateImages().catch(console.error)
