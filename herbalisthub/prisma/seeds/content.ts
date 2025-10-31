import { PrismaClient } from "@prisma/client"

/**
 * Seed content and educational materials
 */
export async function seedContent(prisma: PrismaClient) {
  // Get users for content creation
  const herbalists = await prisma.user.findMany({
    where: { role: "HERBALIST" }
  })

  if (herbalists.length === 0) {
    console.log("   ⚠️ No herbalists found. Skipping content seeding.")
    return []
  }

  const author1 = herbalists[0]
  const author2 = herbalists[1] || herbalists[0]

  // Create blog posts
  const blogPosts = [
    {
      title: "Understanding Adaptogens: Nature's Stress Fighters",
      slug: "understanding-adaptogens-stress-fighters",
      excerpt: "Discover how adaptogenic herbs like ashwagandha and rhodiola can help your body naturally manage stress and build resilience.",
      content: `# Understanding Adaptogens: Nature's Stress Fighters

In our modern world of constant connectivity and endless demands, stress has become an unwelcome companion for many of us. While acute stress can be beneficial, chronic stress takes a significant toll on our health, affecting everything from our immune system to our mental clarity. This is where adaptogens—a unique class of herbs—can offer profound support.

## What Are Adaptogens?

Adaptogens are a special category of herbs that help the body adapt to stress and maintain homeostasis. The term "adaptogen" was coined by Russian scientist Dr. Nikolai Lazarev in 1947, but these herbs have been used in traditional medicine systems for thousands of years.

To be classified as an adaptogen, a herb must meet three specific criteria:
1. It must be non-toxic in normal doses
2. It must help the body cope with stress
3. It must normalize bodily functions regardless of the direction of change

## How Adaptogens Work

Adaptogens work primarily on the hypothalamic-pituitary-adrenal (HPA) axis—our body's central stress response system. When we encounter stress, this axis triggers the release of stress hormones like cortisol. While this response is essential for survival, chronic activation can lead to adrenal fatigue, anxiety, depression, and numerous other health issues.

Adaptogens help modulate this response, acting like a thermostat for our stress system. They don't suppress the stress response entirely but rather help it function more efficiently and recover more quickly.

## Key Adaptogenic Herbs

### Ashwagandha (Withania somnifera)
Often called "Indian Winter Cherry," ashwagandha is perhaps the most well-researched adaptogen. Studies show it can:
- Reduce cortisol levels by up to 30%
- Improve stress and anxiety symptoms
- Enhance energy and stamina
- Support healthy sleep patterns

### Rhodiola (Rhodiola rosea)
This Arctic herb has been used by Vikings and Russian athletes for centuries. Research indicates rhodiola can:
- Improve mental performance under stress
- Reduce fatigue and burnout
- Enhance physical endurance
- Support mood balance

### Holy Basil (Ocimum tenuiflorum)
Revered in Ayurveda as "The Queen of Herbs," holy basil offers:
- Stress reduction and anxiety relief
- Blood sugar regulation support
- Respiratory health benefits
- Antioxidant protection

## Incorporating Adaptogens Into Your Life

Adaptogens work best when taken consistently over time—think of them as long-term allies rather than quick fixes. Most people begin to notice benefits within 2-4 weeks of regular use, with optimal effects often seen after 2-3 months.

### Forms and Dosing
Adaptogens are available in various forms:
- **Powders**: Can be mixed into smoothies, teas, or foods
- **Capsules**: Convenient for consistent dosing
- **Tinctures**: Liquid extracts that are quickly absorbed
- **Teas**: Gentle and hydrating way to consume herbs

### Timing Matters
Most adaptogens are best taken in the morning or early afternoon, as they can provide energy and alertness. However, some, like ashwagandha, can be relaxing and may be better taken in the evening.

## A Word of Caution

While adaptogens are generally safe for most people, they're not appropriate for everyone. Pregnant and breastfeeding women, children, and people with certain medical conditions should consult with a qualified herbalist or healthcare provider before use.

Additionally, adaptogens may interact with certain medications, particularly those for diabetes, blood pressure, and immunosuppressive drugs.

## The Bottom Line

Adaptogens offer a gentle, natural approach to stress management that works with your body's innate wisdom rather than against it. While they're not a magic bullet, when combined with healthy lifestyle practices like adequate sleep, regular exercise, and stress management techniques, they can be powerful allies in our quest for better health and resilience.

Remember, the best adaptogen for you is one that you'll take consistently and that addresses your specific needs. Consider working with a qualified herbalist to develop a personalized protocol that's right for your unique constitution and circumstances.`,
      metaTitle: "Understanding Adaptogens: Complete Guide to Nature's Stress Fighters",
      metaDescription: "Learn how adaptogenic herbs like ashwagandha and rhodiola help your body naturally manage stress. Complete guide to choosing and using adaptogens safely.",
      keywords: ["adaptogens", "stress management", "ashwagandha", "rhodiola", "herbal medicine", "natural health"],
      featuredImage: "https://images.unsplash.com/photo-1544966503-7cc5ac882d6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      authorId: author1.id,
      published: true,
      publishedAt: new Date("2024-02-15T10:00:00Z"),
      readTime: 8,
      tags: ["adaptogens", "stress", "herbal-medicine", "wellness"]
    },
    {
      title: "Digestive Health: The Foundation of Wellness",
      slug: "digestive-health-foundation-wellness",
      excerpt: "Explore how proper digestion affects your entire body and discover gentle herbal remedies for common digestive complaints.",
      content: `# Digestive Health: The Foundation of Wellness

In traditional medicine systems around the world, digestive health is considered the cornerstone of overall wellness. The ancient Greek physician Hippocrates famously stated, "All disease begins in the gut," and modern research continues to validate this wisdom. Our digestive system is far more than just a food processing plant—it's intimately connected to our immune system, mental health, and overall vitality.

## The Digestive System: More Than Meets the Eye

Your digestive tract is home to trillions of microorganisms collectively known as the gut microbiome. This complex ecosystem influences:
- Immune function (70% of immune cells reside in the gut)
- Mood and mental health (the gut-brain axis)
- Nutrient absorption and metabolism
- Inflammation levels throughout the body
- Hormone production and regulation

When digestion is impaired, it can manifest in seemingly unrelated symptoms like skin issues, mood disorders, frequent infections, and chronic fatigue.

## Common Digestive Complaints

### Bloating and Gas
One of the most common digestive complaints, bloating often results from:
- Eating too quickly
- Food intolerances
- Imbalanced gut bacteria
- Stress affecting digestive function

### Heartburn and Acid Reflux
Contrary to popular belief, heartburn is often caused by too little stomach acid rather than too much. Low stomach acid can result from:
- Chronic stress
- Aging
- Certain medications
- H. pylori bacterial overgrowth

### Irregular Bowel Movements
Whether dealing with constipation or loose stools, irregularity often stems from:
- Inadequate fiber intake
- Dehydration
- Stress
- Imbalanced gut bacteria
- Food sensitivities

## Herbal Allies for Digestive Health

Nature provides numerous gentle yet effective remedies for digestive support:

### Bitter Herbs
Bitters stimulate digestive juices and improve overall digestive function:
- **Dandelion root**: Supports liver and gallbladder function
- **Gentian**: Powerful bitter that stimulates stomach acid production
- **Artichoke leaf**: Supports bile production and fat digestion

### Carminative Herbs
These aromatic herbs reduce gas and bloating:
- **Fennel**: Excellent for after-meal digestive comfort
- **Peppermint**: Soothes digestive spasms and reduces gas
- **Ginger**: Stimulates digestion and reduces nausea

### Demulcent Herbs
These mucilage-rich herbs soothe and protect the digestive tract:
- **Marshmallow root**: Creates a protective coating in the digestive tract
- **Slippery elm**: Soothes inflammation and irritation
- **Aloe vera**: Cooling and healing for inflamed digestive tissues

### Nervine Herbs
Since stress significantly impacts digestion, nervine herbs can be invaluable:
- **Chamomile**: Calms both nerves and digestive spasms
- **Lemon balm**: Reduces stress and supports digestive function
- **Lavender**: Promotes relaxation and reduces digestive tension

## Supporting Digestive Health Naturally

### Mindful Eating Practices
- Eat in a relaxed environment
- Chew food thoroughly (aim for 20-30 chews per bite)
- Avoid drinking large amounts of liquid with meals
- Take a few deep breaths before eating to activate the parasympathetic nervous system

### Optimize Stomach Acid
- Consider apple cider vinegar before meals
- Include fermented foods regularly
- Manage stress levels
- Avoid antacids unless absolutely necessary

### Support Beneficial Bacteria
- Include prebiotic foods (garlic, onions, asparagus, artichokes)
- Consume fermented foods (sauerkraut, kimchi, kefir, yogurt)
- Consider a high-quality probiotic supplement
- Minimize antibiotic use when possible

### Herbal Tea Blends for Digestive Support

Here are some effective combinations:

**After-Meal Digestive Tea:**
- 2 parts fennel seeds
- 1 part chamomile flowers
- 1 part peppermint leaves
- 1/2 part ginger root

**Bitter Digestive Stimulant:**
- 2 parts dandelion root
- 1 part burdock root
- 1 part orange peel
- 1/2 part ginger root

**Soothing Digestive Tea:**
- 2 parts chamomile flowers
- 1 part marshmallow root
- 1 part lemon balm
- 1/2 part licorice root

## When to Seek Professional Help

While herbal remedies can be incredibly effective for common digestive complaints, it's important to work with a healthcare provider if you experience:
- Persistent abdominal pain
- Blood in stool
- Unexplained weight loss
- Severe or worsening symptoms
- Symptoms that interfere with daily life

## The Path Forward

Digestive health is a journey, not a destination. Small, consistent changes often yield the most sustainable results. Start with one or two interventions—perhaps adding a bitter herb before meals or practicing mindful eating—and gradually build from there.

Remember, your digestive system is unique, and what works for one person may not work for another. Consider working with a qualified herbalist or integrative healthcare provider to develop a personalized approach that addresses your specific needs and constitution.

By nurturing your digestive health, you're laying the foundation for improved energy, better mood, stronger immunity, and overall vitality. Your gut will thank you, and so will the rest of your body.`,
      metaTitle: "Digestive Health Guide: Natural Herbal Remedies for Gut Wellness",
      metaDescription: "Discover how digestive health affects your entire body. Learn about herbal remedies for bloating, heartburn, and other common digestive issues.",
      keywords: ["digestive health", "gut health", "herbal remedies", "bloating", "heartburn", "natural medicine"],
      featuredImage: "https://images.unsplash.com/photo-1559181567-c3190ca9959b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      authorId: author2.id,
      published: true,
      publishedAt: new Date("2024-03-01T14:00:00Z"),
      readTime: 12,
      tags: ["digestion", "gut-health", "herbal-medicine", "wellness", "nutrition"]
    },
    {
      title: "Sleep Naturally: Herbal Solutions for Better Rest",
      slug: "sleep-naturally-herbal-solutions",
      excerpt: "Discover gentle, effective herbal remedies to improve your sleep quality naturally, without the side effects of pharmaceutical sleep aids.",
      content: `# Sleep Naturally: Herbal Solutions for Better Rest

In our 24/7 world, quality sleep has become a precious commodity. According to the CDC, one in three adults doesn't get enough sleep, and sleep disorders affect millions worldwide. While pharmaceutical sleep aids may provide temporary relief, they often come with side effects and don't address the root causes of sleep disturbances. Herbal medicine offers a gentler, more holistic approach to achieving restorative sleep.

## Understanding Sleep Challenges

Before exploring herbal solutions, it's important to understand the different types of sleep difficulties:

### Difficulty Falling Asleep (Sleep Onset Insomnia)
Often related to:
- Racing thoughts and mental overstimulation
- Anxiety and worry
- Caffeine or stimulant use
- Poor sleep hygiene

### Frequent Waking (Sleep Maintenance Insomnia)
May be caused by:
- Stress and cortisol imbalances
- Blood sugar fluctuations
- Environmental factors (light, noise, temperature)
- Hormonal changes

### Early Morning Waking
Often associated with:
- Depression
- Cortisol rhythm disruptions
- Age-related changes
- Seasonal affective patterns

### Non-Restorative Sleep
Can result from:
- Sleep apnea or other breathing disorders
- Chronic stress
- Nutrient deficiencies
- Underlying health conditions

## Herbal Allies for Better Sleep

### Primary Sedative Herbs

**Passionflower (Passiflora incarnata)**
This gentle nervine is excellent for racing thoughts and mental restlessness:
- Increases GABA activity in the brain
- Reduces anxiety without causing grogginess
- Particularly helpful for stress-induced insomnia
- Safe for long-term use

**Valerian (Valeriana officinalis)**
A powerful but gentle sedative herb:
- Shortens time to fall asleep
- Improves deep sleep quality
- Particularly effective for muscle tension-related sleep issues
- Best taken 30-60 minutes before bedtime

**California Poppy (Eschscholzia californica)**
A mild sedative with additional benefits:
- Gentle sleep promotion without addiction potential
- Helps with pain-related sleep disturbances
- Combines well with other nervine herbs
- Safe for children (with proper dosing)

### Supporting Nervine Herbs

**Chamomile (Matricaria chamomilla)**
The classic bedtime tea herb:
- Mild sedative and anti-anxiety properties
- Soothes digestive upset that can interfere with sleep
- Safe for all ages
- Can be used daily without tolerance issues

**Lemon Balm (Melissa officinalis)**
A gentle herb for both relaxation and mood:
- Calms nervous tension
- Supports healthy cortisol rhythms
- Pleasant taste makes it ideal for bedtime teas
- Combines well with other nervine herbs

**Lavender (Lavandula angustifolia)**
Aromatic relaxation support:
- Proven to improve sleep quality
- Can be used as essential oil (aromatherapy) or internally
- Particularly effective for stress-related sleep issues
- Creates pleasant, calming bedtime rituals

### Adaptogenic Sleep Support

**Ashwagandha (Withania somnifera)**
While often considered energizing, ashwagandha can be deeply relaxing for some:
- Helps regulate cortisol rhythms
- Supports healthy stress response
- Best taken in evening for sleep support
- Particularly helpful for stress-related insomnia

**Reishi Mushroom (Ganoderma lucidum)**
The "mushroom of immortality":
- Promotes calm, restorative sleep
- Supports overall stress resilience
- Helps regulate circadian rhythms
- Can be taken daily for long-term benefits

## Creating Effective Sleep Formulas

### Gentle Sleep Tea
Perfect for daily use:
- 2 parts chamomile flowers
- 1 part lemon balm
- 1 part passionflower
- 1/2 part lavender flowers

Steep 1-2 teaspoons in hot water for 10-15 minutes. Drink 30-60 minutes before bedtime.

### Stronger Sleep Blend
For more significant sleep challenges:
- 2 parts passionflower
- 1 part valerian root
- 1 part California poppy
- 1 part chamomile

Take as tincture or capsules following manufacturer's directions.

### Stress-Related Insomnia Formula
When stress is the primary culprit:
- 2 parts ashwagandha root
- 1 part passionflower
- 1 part lemon balm
- 1 part chamomile

## Sleep Hygiene: The Foundation

Even the best herbs work better when combined with good sleep hygiene:

### Create a Sleep Sanctuary
- Keep bedroom cool, dark, and quiet
- Invest in comfortable bedding
- Remove electronic devices or use blue light filters
- Consider blackout curtains or an eye mask

### Establish a Wind-Down Routine
- Start preparing for sleep 1-2 hours before bedtime
- Dim lights throughout the house
- Engage in calming activities (reading, gentle stretching, meditation)
- Take a warm bath with Epsom salts and lavender

### Optimize Your Sleep Schedule
- Go to bed and wake up at consistent times
- Get morning sunlight exposure
- Avoid caffeine after 2 PM
- Limit alcohol, especially close to bedtime

### Address Lifestyle Factors
- Regular exercise (but not close to bedtime)
- Manage stress through relaxation techniques
- Consider meditation or mindfulness practices
- Keep a worry journal to clear mental clutter

## Special Considerations

### Pregnancy and Breastfeeding
Many sleep herbs are not recommended during pregnancy and breastfeeding. Safe options include:
- Chamomile (in moderate amounts)
- Lemon balm
- Lavender (external use)

Always consult with a qualified herbalist or healthcare provider.

### Children
Gentle herbs appropriate for children include:
- Chamomile
- Lemon balm
- California poppy (with proper dosing)
- Lavender (aromatherapy)

Use smaller doses and milder preparations for children.

### Medication Interactions
Sleep herbs may interact with:
- Sedative medications
- Anti-anxiety medications
- Blood thinning medications
- Some antidepressants

Always consult with healthcare providers before combining herbs with medications.

## When to Seek Professional Help

Consider professional evaluation if you experience:
- Persistent insomnia lasting more than a few weeks
- Loud snoring or periods of stopped breathing
- Excessive daytime sleepiness
- Sleep issues affecting daily functioning
- Concerns about sleep apnea or other sleep disorders

## The Path to Better Sleep

Improving sleep naturally is often a gradual process. Start with gentle herbs like chamomile and focus on good sleep hygiene. Give herbal protocols at least 2-4 weeks to show full effects, as herbs work more gradually than pharmaceutical sleep aids.

Remember, the goal isn't just to fall asleep quickly, but to achieve truly restorative sleep that leaves you feeling refreshed and energized. With patience, consistency, and the right herbal allies, natural, quality sleep is within reach.

Sweet dreams await—naturally.`,
      metaTitle: "Natural Sleep Remedies: Herbal Solutions for Better Rest",
      metaDescription: "Discover effective herbal remedies for insomnia and sleep problems. Learn about chamomile, valerian, passionflower and other natural sleep aids.",
      keywords: ["natural sleep remedies", "herbal sleep aids", "insomnia", "valerian", "chamomile", "passionflower"],
      featuredImage: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      authorId: author1.id,
      published: true,
      publishedAt: new Date("2024-03-15T16:00:00Z"),
      readTime: 15,
      tags: ["sleep", "insomnia", "herbal-medicine", "relaxation", "wellness"]
    }
  ]

  // Create blog posts
  const createdPosts = []
  for (const postData of blogPosts) {
    const post = await prisma.blogPost.create({
      data: postData
    })
    createdPosts.push(post)
  }

  // Create resource categories
  const resourceCategories = [
    {
      name: "Herb Monographs",
      description: "Detailed information about individual herbs, their properties, uses, and safety considerations.",
      slug: "herb-monographs"
    },
    {
      name: "Condition Guides",
      description: "Comprehensive guides for addressing common health concerns with herbal medicine.",
      slug: "condition-guides"
    },
    {
      name: "Preparation Methods",
      description: "Step-by-step instructions for preparing various herbal remedies.",
      slug: "preparation-methods"
    },
    {
      name: "Safety Information",
      description: "Important safety considerations, contraindications, and drug interactions.",
      slug: "safety-information"
    }
  ]

  for (const categoryData of resourceCategories) {
    await prisma.resourceCategory.create({
      data: categoryData
    })
  }

  // Create educational resources
  const resources = [
    {
      title: "Ashwagandha Monograph",
      description: "Complete guide to ashwagandha including traditional uses, modern research, dosing, and safety information.",
      type: "MONOGRAPH",
      content: "Detailed monograph content would go here...",
      authorId: author1.id,
      categoryId: 1, // Herb Monographs
      published: true,
      downloadUrl: "/resources/ashwagandha-monograph.pdf"
    },
    {
      title: "Tea Preparation Guide",
      description: "Learn the proper techniques for preparing herbal teas to maximize therapeutic benefits.",
      type: "GUIDE",
      content: "Step-by-step tea preparation instructions...",
      authorId: author2.id,
      categoryId: 3, // Preparation Methods
      published: true,
      downloadUrl: "/resources/tea-preparation-guide.pdf"
    }
  ]

  for (const resourceData of resources) {
    await prisma.educationalResource.create({
      data: resourceData
    })
  }

  console.log(`   ✅ Created ${blogPosts.length} blog posts`)
  console.log(`   📂 Created ${resourceCategories.length} resource categories`)
  console.log(`   📚 Created ${resources.length} educational resources`)

  return createdPosts
}