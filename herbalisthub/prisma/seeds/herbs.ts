import { PrismaClient } from "@prisma/client"

/**
 * Seed herb inventory with comprehensive herb database
 */
export async function seedHerbs(prisma: PrismaClient) {
  const herbs = [
    // Adaptogenic Herbs
    {
      name: "Ashwagandha",
      latinName: "Withania somnifera",
      type: "ROOT",
      description: "Powerful adaptogenic herb traditionally used in Ayurveda for stress management, energy, and vitality. Known for its ability to help the body adapt to stress and support adrenal function.",
      quantity: 2500.0,
      unit: "grams",
      minimumStock: 250.0,
      costPerUnit: 0.12,
      supplier: "Mountain Rose Herbs",
      supplierInfo: {
        contact: "orders@mountainroseherbs.com",
        phone: "+1-800-879-3337",
        certifications: ["USDA Organic", "Fair Trade"]
      },
      batchNumber: "ASH-2024-001",
      lotNumber: "L240315",
      harvestDate: new Date("2024-01-15"),
      expirationDate: new Date("2026-01-15"),
      qualityGrade: "Organic",
      certifications: ["USDA Organic", "Third-party tested"],
      storageLocation: "Bin A-12",
      storageConditions: {
        temperature: "Cool, dry place",
        humidity: "< 60%",
        light: "Protect from direct sunlight"
      },
      notes: "High-quality root powder. Popular for stress support formulas. Good customer feedback."
    },
    {
      name: "Rhodiola",
      latinName: "Rhodiola rosea",
      type: "ROOT",
      description: "Arctic adaptogen known for enhancing mental performance, reducing fatigue, and supporting stress resilience. Traditionally used in Scandinavian and Russian medicine.",
      quantity: 1800.0,
      unit: "grams",
      minimumStock: 200.0,
      costPerUnit: 0.25,
      supplier: "Starwest Botanicals",
      supplierInfo: {
        contact: "info@starwest-botanicals.com",
        phone: "+1-800-800-4372",
        certifications: ["USDA Organic", "Kosher"]
      },
      batchNumber: "RHO-2024-001",
      lotNumber: "L240220",
      harvestDate: new Date("2023-09-10"),
      expirationDate: new Date("2025-09-10"),
      qualityGrade: "Organic",
      certifications: ["USDA Organic", "Heavy metals tested"],
      storageLocation: "Bin A-15",
      storageConditions: {
        temperature: "Cool, dry place",
        humidity: "< 60%",
        light: "Protect from light"
      },
      notes: "Premium grade. 3% rosavins, 1% salidroside standardized extract."
    },

    // Digestive Herbs
    {
      name: "Ginger",
      latinName: "Zingiber officinale",
      type: "ROOT",
      description: "Warming digestive herb with anti-inflammatory properties. Excellent for nausea, motion sickness, and digestive upset.",
      quantity: 3200.0,
      unit: "grams",
      minimumStock: 300.0,
      costPerUnit: 0.08,
      supplier: "Frontier Co-op",
      supplierInfo: {
        contact: "customercare@frontier.coop",
        phone: "+1-800-669-3275",
        certifications: ["USDA Organic", "Fair Trade"]
      },
      batchNumber: "GIN-2024-002",
      lotNumber: "L240118",
      harvestDate: new Date("2023-11-20"),
      expirationDate: new Date("2025-11-20"),
      qualityGrade: "Organic",
      certifications: ["USDA Organic", "Microbiological tested"],
      storageLocation: "Bin B-5",
      storageConditions: {
        temperature: "Cool, dry place",
        humidity: "< 65%",
        light: "Protect from light"
      },
      notes: "Powdered root. Very aromatic batch. High in gingerols."
    },
    {
      name: "Fennel",
      latinName: "Foeniculum vulgare",
      type: "SEED",
      description: "Carminative herb excellent for digestive issues, gas, and bloating. Sweet, licorice-like flavor makes it pleasant for children.",
      quantity: 1500.0,
      unit: "grams",
      minimumStock: 150.0,
      costPerUnit: 0.06,
      supplier: "Mountain Rose Herbs",
      supplierInfo: {
        contact: "orders@mountainroseherbs.com",
        phone: "+1-800-879-3337",
        certifications: ["USDA Organic"]
      },
      batchNumber: "FEN-2024-001",
      lotNumber: "L240205",
      harvestDate: new Date("2023-08-15"),
      expirationDate: new Date("2025-08-15"),
      qualityGrade: "Organic",
      certifications: ["USDA Organic", "Pesticide residue tested"],
      storageLocation: "Bin B-8",
      storageConditions: {
        temperature: "Cool, dry place",
        humidity: "< 60%",
        light: "Protect from light"
      },
      notes: "Whole seeds. Excellent aroma and flavor. Good for teas and digestive blends."
    },

    // Nervine Herbs
    {
      name: "Chamomile",
      latinName: "Matricaria chamomilla",
      type: "FLOWER",
      description: "Gentle nervine and anti-inflammatory herb. Excellent for anxiety, insomnia, and digestive upset. Very safe for children.",
      quantity: 2800.0,
      unit: "grams",
      minimumStock: 250.0,
      costPerUnit: 0.15,
      supplier: "Starwest Botanicals",
      supplierInfo: {
        contact: "info@starwest-botanicals.com",
        phone: "+1-800-800-4372",
        certifications: ["USDA Organic", "Egyptian"]
      },
      batchNumber: "CHA-2024-003",
      lotNumber: "L240301",
      harvestDate: new Date("2023-07-10"),
      expirationDate: new Date("2025-07-10"),
      qualityGrade: "Organic",
      certifications: ["USDA Organic", "Apigenin tested"],
      storageLocation: "Bin C-2",
      storageConditions: {
        temperature: "Cool, dry place",
        humidity: "< 55%",
        light: "Protect from light"
      },
      notes: "Beautiful blue oil content. Egyptian grade flowers. Excellent for nighttime formulas."
    },
    {
      name: "Passionflower",
      latinName: "Passiflora incarnata",
      type: "DRIED_HERB",
      description: "Calming nervine herb traditionally used for anxiety, insomnia, and nervous tension. Gentle but effective sedative properties.",
      quantity: 1200.0,
      unit: "grams",
      minimumStock: 120.0,
      costPerUnit: 0.18,
      supplier: "Mountain Rose Herbs",
      supplierInfo: {
        contact: "orders@mountainroseherbs.com",
        phone: "+1-800-879-3337",
        certifications: ["Wildcrafted", "Sustainably harvested"]
      },
      batchNumber: "PAS-2024-001",
      lotNumber: "L240210",
      harvestDate: new Date("2023-08-25"),
      expirationDate: new Date("2025-08-25"),
      qualityGrade: "Wildcrafted",
      certifications: ["Sustainably wildcrafted", "Heavy metals tested"],
      storageLocation: "Bin C-7",
      storageConditions: {
        temperature: "Cool, dry place",
        humidity: "< 60%",
        light: "Protect from light"
      },
      notes: "Cut and sifted aerial parts. Good color retention. Excellent for anxiety formulas."
    },

    // Immune Support Herbs
    {
      name: "Echinacea",
      latinName: "Echinacea purpurea",
      type: "ROOT",
      description: "Popular immune-supporting herb. Best used at onset of illness or for short-term immune system support.",
      quantity: 2000.0,
      unit: "grams",
      minimumStock: 200.0,
      costPerUnit: 0.22,
      supplier: "Frontier Co-op",
      supplierInfo: {
        contact: "customercare@frontier.coop",
        phone: "+1-800-669-3275",
        certifications: ["USDA Organic", "American grown"]
      },
      batchNumber: "ECH-2024-002",
      lotNumber: "L240125",
      harvestDate: new Date("2023-10-15"),
      expirationDate: new Date("2025-10-15"),
      qualityGrade: "Organic",
      certifications: ["USDA Organic", "Alkamide content verified"],
      storageLocation: "Bin D-3",
      storageConditions: {
        temperature: "Cool, dry place",
        humidity: "< 60%",
        light: "Protect from light"
      },
      notes: "Powdered root. High alkamide content. American grown stock."
    },
    {
      name: "Elderberry",
      latinName: "Sambucus nigra",
      type: "FRUIT",
      description: "Antiviral and immune-supporting berry. Rich in anthocyanins and flavonoids. Excellent for cold and flu support.",
      quantity: 1800.0,
      unit: "grams",
      minimumStock: 180.0,
      costPerUnit: 0.19,
      supplier: "Starwest Botanicals",
      supplierInfo: {
        contact: "info@starwest-botanicals.com",
        phone: "+1-800-800-4372",
        certifications: ["USDA Organic", "European"]
      },
      batchNumber: "ELD-2024-001",
      lotNumber: "L240208",
      harvestDate: new Date("2023-09-05"),
      expirationDate: new Date("2025-09-05"),
      qualityGrade: "Organic",
      certifications: ["USDA Organic", "Anthocyanin tested"],
      storageLocation: "Bin D-8",
      storageConditions: {
        temperature: "Cool, dry place",
        humidity: "< 60%",
        light: "Protect from light"
      },
      notes: "Dried berries. Deep purple color. High anthocyanin content."
    },

    // Women's Health Herbs
    {
      name: "Red Clover",
      latinName: "Trifolium pratense",
      type: "FLOWER",
      description: "Phytoestrogen-rich herb traditionally used for menopausal support and women's health. Also used for skin conditions.",
      quantity: 1600.0,
      unit: "grams",
      minimumStock: 160.0,
      costPerUnit: 0.14,
      supplier: "Mountain Rose Herbs",
      supplierInfo: {
        contact: "orders@mountainroseherbs.com",
        phone: "+1-800-879-3337",
        certifications: ["USDA Organic"]
      },
      batchNumber: "RED-2024-001",
      lotNumber: "L240215",
      harvestDate: new Date("2023-06-20"),
      expirationDate: new Date("2025-06-20"),
      qualityGrade: "Organic",
      certifications: ["USDA Organic", "Isoflavone content verified"],
      storageLocation: "Bin E-4",
      storageConditions: {
        temperature: "Cool, dry place",
        humidity: "< 60%",
        light: "Protect from light"
      },
      notes: "Cut and sifted flowers. Good color. High isoflavone content."
    },
    {
      name: "Vitex",
      latinName: "Vitex agnus-castus",
      type: "FRUIT",
      description: "Hormone-balancing herb traditionally used for PMS, irregular cycles, and fertility support. Works on the pituitary gland.",
      quantity: 1400.0,
      unit: "grams",
      minimumStock: 140.0,
      costPerUnit: 0.28,
      supplier: "Starwest Botanicals",
      supplierInfo: {
        contact: "info@starwest-botanicals.com",
        phone: "+1-800-800-4372",
        certifications: ["USDA Organic", "Mediterranean"]
      },
      batchNumber: "VIT-2024-001",
      lotNumber: "L240222",
      harvestDate: new Date("2023-08-30"),
      expirationDate: new Date("2025-08-30"),
      qualityGrade: "Organic",
      certifications: ["USDA Organic", "Casticin content verified"],
      storageLocation: "Bin E-9",
      storageConditions: {
        temperature: "Cool, dry place",
        humidity: "< 60%",
        light: "Protect from light"
      },
      notes: "Whole berries. Aromatic pepper-like scent. Mediterranean origin."
    }
  ]

  // Create herbs
  for (const herbData of herbs) {
    await prisma.herb.create({
      data: herbData
    })
  }

  // Create some inventory logs to show activity
  const allHerbs = await prisma.herb.findMany()
  
  const inventoryLogs = [
    {
      herbId: allHerbs[0].id, // Ashwagandha
      action: "ADD",
      quantity: 5000.0,
      reason: "Initial stock purchase",
    },
    {
      herbId: allHerbs[0].id,
      action: "REMOVE",
      quantity: 2500.0,
      reason: "Used for formula production",
    },
    {
      herbId: allHerbs[2].id, // Ginger
      action: "ADD",
      quantity: 5000.0,
      reason: "Bulk purchase",
    },
    {
      herbId: allHerbs[2].id,
      action: "REMOVE",
      quantity: 1800.0,
      reason: "Client formulations",
    },
    {
      herbId: allHerbs[4].id, // Chamomile
      action: "ADJUST",
      quantity: -200.0,
      reason: "Inventory correction after audit",
    }
  ]

  for (const log of inventoryLogs) {
    await prisma.inventoryLog.create({
      data: log
    })
  }

  console.log(`   ✅ Created ${herbs.length} herbs in inventory`)
  console.log(`   📊 Created ${inventoryLogs.length} inventory log entries`)

  return allHerbs
}