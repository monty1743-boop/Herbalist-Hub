import { PrismaClient } from "@prisma/client"

/**
 * Seed appointments and consultation data
 */
export async function seedAppointments(prisma: PrismaClient) {
  // Get users for appointments
  const herbalists = await prisma.user.findMany({
    where: { role: "HERBALIST" },
    include: { practiceInfo: true }
  })

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    include: { clientProfile: true }
  })

  if (herbalists.length === 0 || clients.length === 0) {
    console.log("   ⚠️ No herbalists or clients found. Skipping appointment seeding.")
    return []
  }

  const herbalist1 = herbalists[0]
  const herbalist2 = herbalists[1] || herbalists[0]
  const client1 = clients[0]
  const client2 = clients[1] || clients[0]
  const client3 = clients[2] || clients[0]

  // Create past, current, and future appointments
  const appointments = [
    // Past appointments
    {
      clientId: client1.id,
      herbalistId: herbalist1.id,
      title: "Initial Consultation - Stress Management",
      description: "Comprehensive intake and assessment for stress-related health concerns. Discuss symptoms, lifestyle, and treatment goals.",
      type: "INITIAL_CONSULTATION",
      status: "COMPLETED",
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T11:30:00Z"),
      location: "Chen Herbal Wellness Clinic",
      isVirtual: false,
      notes: "Client reports high stress levels, fatigue, and digestive issues. Good candidate for adaptogenic protocol.",
      cost: 150.00,
      paymentStatus: "PAID"
    },
    {
      clientId: client1.id,
      herbalistId: herbalist1.id,
      title: "Follow-up - Stress Support Protocol",
      description: "Review progress on stress support protocol, assess herb tolerance, and adjust dosages as needed.",
      type: "FOLLOW_UP",
      status: "COMPLETED",
      startTime: new Date("2024-02-12T14:00:00Z"),
      endTime: new Date("2024-02-12T15:00:00Z"),
      location: "Chen Herbal Wellness Clinic",
      isVirtual: false,
      notes: "Good progress with ashwagandha blend. Energy levels improving. Continue protocol with minor adjustments.",
      cost: 100.00,
      paymentStatus: "PAID"
    },
    {
      clientId: client2.id,
      herbalistId: herbalist2.id,
      title: "Initial Consultation - Diabetes Support",
      description: "Herbal support consultation for type 2 diabetes management. Focus on blood sugar support and cardiovascular health.",
      type: "INITIAL_CONSULTATION",
      status: "COMPLETED",
      startTime: new Date("2024-02-01T09:00:00Z"),
      endTime: new Date("2024-02-01T10:30:00Z"),
      location: "Mountain View Herbal Clinic",
      isVirtual: false,
      notes: "Established diabetes, taking metformin. Interested in complementary herbal support for blood sugar management.",
      cost: 175.00,
      paymentStatus: "PAID"
    },
    {
      clientId: client3.id,
      herbalistId: herbalist1.id,
      title: "Women's Health Consultation",
      description: "Initial consultation for menstrual irregularities and sleep issues. Comprehensive hormonal assessment.",
      type: "INITIAL_CONSULTATION",
      status: "COMPLETED",
      startTime: new Date("2024-03-10T11:00:00Z"),
      endTime: new Date("2024-03-10T12:30:00Z"),
      location: "Chen Herbal Wellness Clinic",
      isVirtual: false,
      notes: "Irregular cycles, insomnia. Stress may be contributing factor. Consider vitex and nervine herbs.",
      cost: 150.00,
      paymentStatus: "PAID"
    },

    // Upcoming appointments
    {
      clientId: client1.id,
      herbalistId: herbalist1.id,
      title: "Quarterly Check-in",
      description: "Three-month progress review. Assess overall health improvements and plan next phase of treatment.",
      type: "FOLLOW_UP",
      status: "SCHEDULED",
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour duration
      location: "Chen Herbal Wellness Clinic",
      isVirtual: false,
      notes: "Routine quarterly assessment. Client doing well on current protocol.",
      cost: 100.00,
      paymentStatus: "PENDING"
    },
    {
      clientId: client2.id,
      herbalistId: herbalist2.id,
      title: "Virtual Follow-up - Blood Sugar Support",
      description: "Remote consultation to review lab results and adjust herbal protocol for diabetes support.",
      type: "VIDEO_CONSULT",
      status: "SCHEDULED",
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // 45 min duration
      location: "Virtual - Zoom",
      isVirtual: true,
      notes: "Review recent A1C results. Client reports good compliance with herbal protocol.",
      cost: 85.00,
      paymentStatus: "PENDING"
    },
    {
      clientId: client3.id,
      herbalistId: herbalist1.id,
      title: "Follow-up - Cycle Regulation",
      description: "Assessment of menstrual cycle improvements after 6 weeks on vitex protocol.",
      type: "FOLLOW_UP",
      status: "SCHEDULED",
      startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour duration
      location: "Chen Herbal Wellness Clinic",
      isVirtual: false,
      notes: "Six-week follow-up for hormone balance protocol. Check cycle tracking data.",
      cost: 100.00,
      paymentStatus: "PENDING"
    }
  ]

  // Create appointments
  const createdAppointments = []
  for (const appointmentData of appointments) {
    const appointment = await prisma.appointment.create({
      data: appointmentData
    })
    createdAppointments.push(appointment)
  }

  // Create consultation notes for completed appointments
  const consultationNotes = [
    {
      clientProfileId: client1.clientProfile!.id,
      appointmentId: createdAppointments[0].id,
      chiefComplaint: "Patient reports chronic stress from work demands, resulting in fatigue, anxiety, and digestive upset. Symptoms have been worsening over the past 6 months. Sleep quality poor, waking frequently.",
      assessment: "Constitutional type appears to be predominantly anxious with depleted energy reserves. Signs of adrenal fatigue with digestive weakness. Stress response appears hyperactive with poor recovery. Good candidate for adaptogenic support with nervine herbs.",
      recommendations: `Protocol established:
1. Stress Support Blend: 1 tsp twice daily as tea or 3 capsules morning and evening
2. Digestive Comfort Tea: 1 cup after meals as needed
3. Sleep & Relaxation Blend: 1 cup 1 hour before bedtime
4. Lifestyle recommendations: 10 minutes daily meditation, reduce caffeine intake, establish consistent sleep schedule
5. Dietary modifications: increase omega-3 rich foods, reduce processed foods

Follow-up in 4 weeks to assess tolerance and progress.`,
      followUp: "Schedule follow-up in 4 weeks. Monitor stress levels, sleep quality, and digestive symptoms. Adjust herb dosages based on response.",
      sessionDate: new Date("2024-01-15T10:00:00Z"),
      duration: 90,
      sessionType: "in_person",
      privateNotes: "Client very motivated and receptive to herbal treatment. Good understanding of holistic approach. May benefit from constitutional typing assessment in future visits."
    },
    {
      clientProfileId: client1.clientProfile!.id,
      appointmentId: createdAppointments[1].id,
      chiefComplaint: "Follow-up visit after 4 weeks on stress support protocol. Reports significant improvement in energy levels and sleep quality. Digestive symptoms much improved.",
      assessment: "Excellent response to adaptogenic protocol. Energy levels increased approximately 40% by client report. Sleep latency improved from 45 minutes to 15 minutes. Digestive upset resolved. Stress tolerance markedly improved.",
      recommendations: `Continue current protocol with modifications:
1. Stress Support Blend: Continue 1 tsp twice daily
2. Digestive tea: Reduce to as-needed basis only
3. Sleep blend: Continue nightly, may reduce to every other night if sleep remains stable
4. Add exercise routine as energy permits
5. Consider adding B-complex vitamin for additional adrenal support

Protocol working well. Continue for another 6-8 weeks then reassess.`,
      followUp: "Next follow-up in 8 weeks. Client to track energy levels and sleep quality daily. Contact if any adverse reactions.",
      sessionDate: new Date("2024-02-12T14:00:00Z"),
      duration: 60,
      sessionType: "in_person",
      privateNotes: "Remarkable improvement in such a short time. Client very compliant with protocol. Consider this case for treatment outcome documentation."
    },
    {
      clientProfileId: client2.clientProfile!.id,
      appointmentId: createdAppointments[2].id,
      chiefComplaint: "Type 2 diabetes diagnosis 3 years ago, currently managing with metformin 500mg twice daily. Recent A1C: 7.2%. Seeks herbal support for blood sugar management and cardiovascular protection.",
      assessment: "Well-controlled diabetes with room for improvement. No signs of complications. Good medication compliance. Diet could be optimized. Interested in evidence-based herbal support as adjunct therapy.",
      recommendations: `Diabetes support protocol (to complement medical treatment):
1. Bitter melon extract: 500mg twice daily with meals
2. Cinnamon bark: 1g daily (monitor blood sugar closely)
3. Gymnema sylvestre: 400mg twice daily before meals
4. Alpha-lipoic acid: 300mg daily for antioxidant support
5. Dietary counseling: reduce refined carbohydrates, increase fiber intake
6. Monitor blood glucose more frequently initially

IMPORTANT: Continue all prescribed medications. Regular monitoring with primary care physician essential.`,
      followUp: "Follow-up in 6 weeks with lab results. Client to monitor blood glucose daily and report any significant changes. Coordinate care with primary physician.",
      sessionDate: new Date("2024-02-01T09:00:00Z"),
      duration: 90,
      sessionType: "in_person",
      privateNotes: "Client well-educated about diabetes. Good candidate for herbal adjunct therapy. Excellent communication with primary care team. Monitor closely for hypoglycemia."
    },
    {
      clientProfileId: client3.clientProfile!.id,
      appointmentId: createdAppointments[3].id,
      chiefComplaint: "Irregular menstrual cycles for past 8 months, ranging from 35-50 days. Associated with increased stress from job change. Sleep quality poor, taking 1-2 hours to fall asleep.",
      assessment: "Stress-related menstrual irregularity likely due to hypothalamic-pituitary-adrenal axis disruption. Sleep disturbance secondary to stress and possibly hormonal fluctuations. No signs of PCOS or thyroid dysfunction based on history.",
      recommendations: `Women's hormone balance protocol:
1. Vitex agnus-castus: 400mg each morning (empty stomach)
2. Stress Support Blend: 1 tsp twice daily for HPA axis support
3. Sleep & Relaxation Blend: Nightly 1 hour before bedtime
4. Evening primrose oil: 1000mg twice daily for hormone support
5. Cycle tracking: Record basal body temperature and cycle length
6. Stress management: Develop consistent relaxation practice

Treatment duration: Minimum 3-4 cycles for hormone regulation.`,
      followUp: "Follow-up in 6 weeks to assess initial cycle changes. Bring cycle tracking charts. Full assessment after 3 cycles of treatment.",
      sessionDate: new Date("2024-03-10T11:00:00Z"),
      duration: 90,
      sessionType: "in_person",
      privateNotes: "Young, healthy client with stress-induced cycle irregularity. Good prognosis for hormone balance with consistent treatment. Emphasize patience as hormone regulation takes time."
    }
  ]

  // Create consultation notes
  for (const noteData of consultationNotes) {
    await prisma.consultationNote.create({
      data: noteData
    })
  }

  // Create some intake submissions
  const intakeSubmissions = [
    {
      clientId: client1.id,
      formType: "INITIAL_INTAKE",
      responses: {
        currentSymptoms: ["chronic fatigue", "anxiety", "digestive upset", "poor sleep"],
        medicationList: ["levothyroxine 50mcg daily"],
        allergyList: ["peanuts", "shellfish"],
        healthGoals: "Reduce stress naturally, improve energy levels, better sleep quality",
        lifestyle: {
          exercise: "minimal - desk job",
          diet: "standard American diet, high coffee intake",
          stress: "high - work demands, financial pressure",
          sleep: "poor quality, 6-7 hours nightly"
        },
        familyHistory: ["hypothyroidism (mother)", "anxiety (sister)"],
        previousTreatments: ["therapy for anxiety", "tried melatonin for sleep"]
      },
      submittedAt: new Date("2024-01-14T15:30:00Z"),
      reviewedAt: new Date("2024-01-14T16:45:00Z"),
      reviewedBy: herbalist1.id
    },
    {
      clientId: client2.id,
      formType: "INITIAL_INTAKE",
      responses: {
        currentSymptoms: ["blood sugar fluctuations", "fatigue after meals", "poor circulation"],
        medicationList: ["metformin 500mg twice daily", "lisinopril 10mg daily"],
        allergyList: ["latex"],
        healthGoals: "Better blood sugar control, reduce medication dependence if possible",
        lifestyle: {
          exercise: "walking 30 minutes 3x/week",
          diet: "trying to follow diabetic diet, struggles with carb cravings",
          stress: "moderate - family responsibilities",
          sleep: "generally good, 7-8 hours"
        },
        familyHistory: ["type 2 diabetes (father)", "heart disease (both parents)"],
        previousTreatments: ["diabetes education classes", "nutritionist consultation"]
      },
      submittedAt: new Date("2024-01-31T14:20:00Z"),
      reviewedAt: new Date("2024-01-31T16:10:00Z"),
      reviewedBy: herbalist2.id
    }
  ]

  for (const intakeData of intakeSubmissions) {
    await prisma.intakeSubmission.create({
      data: intakeData
    })
  }

  console.log(`   ✅ Created ${appointments.length} appointments`)
  console.log(`   📝 Created ${consultationNotes.length} consultation notes`)
  console.log(`   📋 Created ${intakeSubmissions.length} intake submissions`)

  return createdAppointments
}