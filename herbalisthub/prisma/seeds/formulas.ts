import { PrismaClient } from "@prisma/client"

/**
 * Seed formulas with realistic herbal preparations
 */
export async function seedFormulas(prisma: PrismaClient) {
  // Get herbs for formula ingredients
  const herbs = await prisma.herb.findMany()
  
  const formulas = [
    {
      name: "Stress Support Blend",
      description: "Adaptogenic formula designed to help the body manage stress and support adrenal function. Combines traditional adaptogens with nervine herbs for comprehensive stress support.",
      instructions: `1. Combine all powdered herbs in a large mixing bowl
2. Mix thoroughly with a wooden spoon to ensure even distribution
3. Store in airtight glass containers away from light and heat
4. Label with batch date and instructions

Preparation method: Can be prepared as tea, capsules, or tincture
- Tea: 1 tsp per cup of hot water, steep 10-15 minutes
- Capsules: Fill 00 capsules, take 2-3 capsules twice daily
- Tincture: Use 1:5 ratio with 40% alcohol, macerate for 4 weeks`,
      category: "Adaptogenic",
      difficulty: "Intermediate",
      prepTime: 30,
      yieldAmount: 500.0,
      yieldUnit: "grams",
      dosage: "1 teaspoon 2-3 times daily as tea, or 2-3 capsules twice daily",
      duration: "2-3 months for optimal benefits",
      contraindications: "Avoid during pregnancy and breastfeeding. Not recommended for children under 12. May interact with blood pressure medications.",
      interactions: "May enhance effects of sedative medications. Consult healthcare provider if taking antidepressants or anxiety medications.",
      basePrice: 45.00,
      laborCost: 15.00,
      markupPercent: 100.00,
      finalPrice: 120.00,
      isPublic: true,
      isDraft: false,
      publishedAt: new Date(),
      ingredients: [
        { herbName: "Ashwagandha", quantity: 150.0, unit: "grams", ratio: "30%" },
        { herbName: "Rhodiola", quantity: 100.0, unit: "grams", ratio: "20%" },
        { herbName: "Chamomile", quantity: 125.0, unit: "grams", ratio: "25%" },
        { herbName: "Passionflower", quantity: 75.0, unit: "grams", ratio: "15%" },
        { herbName: "Ginger", quantity: 50.0, unit: "grams", ratio: "10%" }
      ]
    },
    {
      name: "Digestive Comfort Tea",
      description: "Gentle digestive blend for after-meal comfort. Combines carminative and anti-inflammatory herbs to support healthy digestion and reduce gas and bloating.",
      instructions: `1. Measure equal parts of fennel seeds and chamomile flowers
2. Add ginger powder and mix well
3. Store in airtight container
4. To prepare: Use 1 tablespoon per cup of boiling water
5. Steep covered for 8-10 minutes
6. Strain and enjoy warm after meals

Best consumed 15-30 minutes after eating for optimal digestive support.`,
      category: "Digestive",
      difficulty: "Beginner",
      prepTime: 15,
      yieldAmount: 300.0,
      yieldUnit: "grams",
      dosage: "1 cup after meals, up to 3 times daily",
      duration: "Use as needed for digestive discomfort",
      contraindications: "Avoid if allergic to plants in the Asteraceae family. Not recommended during pregnancy without professional guidance.",
      interactions: "Generally safe. May enhance absorption of other herbs or medications when taken together.",
      basePrice: 25.00,
      laborCost: 8.00,
      markupPercent: 85.00,
      finalPrice: 61.00,
      isPublic: true,
      isDraft: false,
      publishedAt: new Date(),
      ingredients: [
        { herbName: "Fennel", quantity: 120.0, unit: "grams", ratio: "40%" },
        { herbName: "Chamomile", quantity: 120.0, unit: "grams", ratio: "40%" },
        { herbName: "Ginger", quantity: 60.0, unit: "grams", ratio: "20%" }
      ]
    },
    {
      name: "Immune Support Elixir",
      description: "Potent immune-supporting formula combining antiviral and immunomodulating herbs. Best used at first sign of illness or during times of increased exposure to pathogens.",
      instructions: `1. Combine elderberry and echinacea powders
2. Add remaining herbs and mix thoroughly
3. For syrup preparation:
   - Add 2 cups water to herb mixture
   - Simmer on low heat for 20 minutes
   - Strain through fine mesh
   - Add honey to taste (optional)
   - Store in refrigerator for up to 2 weeks

For tincture preparation:
- Use 1:4 ratio with 50% alcohol
- Macerate for 3-4 weeks, shaking daily
- Strain and bottle in amber glass`,
      category: "Immune Support",
      difficulty: "Intermediate",
      prepTime: 45,
      yieldAmount: 400.0,
      yieldUnit: "grams",
      dosage: "Syrup: 1-2 tablespoons 3-4 times daily at first sign of illness. Tincture: 1-2 dropperfuls 4-5 times daily.",
      duration: "Use for 7-10 days maximum. Take breaks between uses.",
      contraindications: "Avoid with autoimmune conditions. Not recommended for extended use. Discontinue if fever persists more than 3 days.",
      interactions: "May interact with immunosuppressive medications. Consult healthcare provider if taking autoimmune medications.",
      basePrice: 55.00,
      laborCost: 20.00,
      markupPercent: 110.00,
      finalPrice: 157.50,
      isPublic: true,
      isDraft: false,
      publishedAt: new Date(),
      ingredients: [
        { herbName: "Elderberry", quantity: 160.0, unit: "grams", ratio: "40%" },
        { herbName: "Echinacea", quantity: 120.0, unit: "grams", ratio: "30%" },
        { herbName: "Ginger", quantity: 80.0, unit: "grams", ratio: "20%" },
        { herbName: "Chamomile", quantity: 40.0, unit: "grams", ratio: "10%" }
      ]
    },
    {
      name: "Women's Balance Formula",
      description: "Hormone-balancing blend specifically formulated for women's reproductive health. Supports healthy menstrual cycles and hormonal balance.",
      instructions: `1. Combine all powdered herbs in exact proportions
2. Mix thoroughly to ensure even distribution
3. Store in airtight, dark containers
4. Label with preparation date and dosage instructions

Preparation options:
- Capsules: Fill 00 capsules, take with meals
- Tea: Mix with warm water or herbal tea base
- Add to smoothies or other beverages

Best taken consistently for 2-3 cycles to see optimal results.
Track symptoms and cycle changes for best assessment.`,
      category: "Women's Health",
      difficulty: "Advanced",
      prepTime: 25,
      yieldAmount: 350.0,
      yieldUnit: "grams",
      dosage: "2-3 capsules twice daily with meals, or 1 teaspoon in warm liquid twice daily",
      duration: "Take consistently for 3-6 months. Evaluate progress monthly.",
      contraindications: "Avoid during pregnancy and breastfeeding. Not recommended for women with hormone-sensitive conditions without professional guidance.",
      interactions: "May interact with hormonal contraceptives and HRT. Consult healthcare provider before use with any hormone-related medications.",
      basePrice: 65.00,
      laborCost: 25.00,
      markupPercent: 120.00,
      finalPrice: 198.00,
      isPublic: false, // Professional formula
      isDraft: false,
      publishedAt: new Date(),
      ingredients: [
        { herbName: "Vitex", quantity: 140.0, unit: "grams", ratio: "40%" },
        { herbName: "Red Clover", quantity: 105.0, unit: "grams", ratio: "30%" },
        { herbName: "Chamomile", quantity: 70.0, unit: "grams", ratio: "20%" },
        { herbName: "Ginger", quantity: 35.0, unit: "grams", ratio: "10%" }
      ]
    },
    {
      name: "Sleep & Relaxation Blend",
      description: "Gentle nervine formula to promote restful sleep and relaxation. Combines traditional sedative herbs in a synergistic blend for natural sleep support.",
      instructions: `1. Gently combine all dried herbs
2. Mix well but avoid crushing delicate flowers
3. Store in airtight container away from light

Evening Tea Preparation:
- Use 1-2 teaspoons per cup of hot water
- Steep covered for 12-15 minutes for full extraction
- Strain and drink 30-60 minutes before bedtime
- Sweeten with honey if desired

Can also be prepared as a glycerite for children or those avoiding alcohol tinctures.`,
      category: "Nervine",
      difficulty: "Beginner",
      prepTime: 20,
      yieldAmount: 250.0,
      yieldUnit: "grams",
      dosage: "1 cup of tea 30-60 minutes before bedtime",
      duration: "Use nightly as needed. Can be used long-term safely.",
      contraindications: "May cause drowsiness. Do not operate machinery after use. Avoid with sedative medications unless under professional guidance.",
      interactions: "May enhance effects of sleep medications, anxiety medications, and alcohol. Use caution when combining with other sedating substances.",
      basePrice: 35.00,
      laborCost: 12.00,
      markupPercent: 90.00,
      finalPrice: 89.30,
      isPublic: true,
      isDraft: false,
      publishedAt: new Date(),
      ingredients: [
        { herbName: "Chamomile", quantity: 125.0, unit: "grams", ratio: "50%" },
        { herbName: "Passionflower", quantity: 87.5, unit: "grams", ratio: "35%" },
        { herbName: "Ginger", quantity: 37.5, unit: "grams", ratio: "15%" }
      ]
    }
  ]

  // Create formulas and their ingredients
  for (const formulaData of formulas) {
    const { ingredients, ...formulaInfo } = formulaData

    const formula = await prisma.formula.create({
      data: formulaInfo
    })

    // Add ingredients to formula
    for (const ingredient of ingredients) {
      const herb = herbs.find((h: any) => h.name === ingredient.herbName)
      if (herb) {
        await prisma.formulaIngredient.create({
          data: {
            formulaId: formula.id,
            herbId: herb.id,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            ratio: ingredient.ratio,
            processingNotes: `Use ${ingredient.ratio} of total formula weight`,
            costPerUnit: herb.costPerUnit,
            totalCost: ingredient.quantity * (herb.costPerUnit || 0)
          }
        })
      }
    }

    // Create preparation instructions for each formula
    const preparations = [
      {
        formulaId: formula.id,
        name: `${formula.name} - Tea Preparation`,
        method: "Hot Water Extraction",
        instructions: `Place 1-2 teaspoons of ${formula.name} in a tea infuser or teapot. Pour 8 oz of hot water (not boiling) over herbs. Cover and steep for 10-15 minutes. Strain and enjoy warm. Can be sweetened with honey if desired.`,
        yieldAmount: 1.0,
        yieldUnit: "cup"
      },
      {
        formulaId: formula.id,
        name: `${formula.name} - Capsule Preparation`,
        method: "Encapsulation",
        instructions: `Fill size 00 capsules with ${formula.name} powder. Use capsule filling machine for consistency. Store in airtight container with desiccant pack. Take with water and food to improve absorption.`,
        yieldAmount: 100.0,
        yieldUnit: "capsules"
      }
    ]

    for (const prep of preparations) {
      await prisma.preparation.create({
        data: prep
      })
    }
  }

  console.log(`   ✅ Created ${formulas.length} formulas`)
  console.log(`   📝 Created ${formulas.length * 2} preparation methods`)
  console.log(`   🧪 Created ${formulas.reduce((acc, f) => acc + f.ingredients.length, 0)} formula ingredients`)

  return await prisma.formula.findMany()
}