/**
 * Mock article generator — 100% free, no network, no API key.
 * Produces CEFR B1-B2 essays (Eiken Grade 2 upper level) from local templates.
 * When a real provider is configured (Ollama / OpenAI-compat / Anthropic),
 * article-generator.ts uses it instead.
 */

const BANK: Record<string, Array<{ title: string; paras: string[] }>> = {
  Technology: [
    {
      title: "Who Is Responsible When AI Makes a Mistake?",
      paras: [
        "Artificial intelligence now helps decide who gets a loan, who is invited to a job interview, and even what medical treatment a patient receives. These systems can process enormous amounts of data in seconds, and they often find patterns that humans would miss. Many companies argue that this makes decisions fairer, because a machine does not get tired or have personal favorites.",
        "However, AI systems learn from data collected in the real world, and real-world data is rarely neutral. If past hiring records favor one group of people, the algorithm may quietly inherit the same bias. The danger is that such discrimination looks objective simply because a computer produced it. A rejected applicant may never learn why the system judged them unsuitable.",
        "This raises a difficult ethical question: who takes responsibility when an algorithm causes harm? The engineer who designed it, the company that deployed it, or no one at all? Many experts argue that important decisions should always allow human review. Transparency also matters. People deserve a clear explanation when a machine significantly affects their lives.",
        "Regulation is beginning to catch up. Several countries are discussing laws that require companies to test their systems for bias and to disclose when AI is used. Technology itself is neither good nor evil, but the rules around it will determine whether it builds trust or destroys it.",
      ],
    },
    {
      title: "Robots That Work Beside Us",
      paras: [
        "Modern robots are leaving their cages. In factories, collaborative robots now assemble products side by side with human workers. In hospitals, robotic arms assist surgeons with movements far more precise than a human hand can achieve. Unlike the machines of the past, these robots are designed to sense their surroundings and stop instantly if a person comes too close.",
        "The economic logic is straightforward. Robots do not need sleep, they rarely make errors, and they can perform repetitive tasks for decades. For aging societies with shrinking workforces, automation looks less like a threat and more like a necessity. Small businesses, too, can now afford machines that were once available only to giant manufacturers.",
        "Yet the spread of robots forces workers to adapt. Jobs that consist mainly of routine physical labor are gradually disappearing, while demand grows for people who can install, maintain, and supervise these systems. Education and retraining therefore become critical. A society that invests in its people can treat automation as liberation from boring work rather than as a source of fear.",
        "Ultimately, the goal should not be to replace humans but to extend their abilities. The most productive workplaces of the future will likely combine machine precision with human judgment, creativity, and care.",
      ],
    },
  ],
  Science: [
    {
      title: "Why Everyone Wants to Go Back to the Moon",
      paras: [
        "More than half a century after the first footsteps on the Moon, space agencies and private companies are racing to return. The motivation this time is not simply national prestige. Scientists have confirmed that water ice exists in the permanently shadowed craters near the lunar south pole. That ice could provide drinking water, breathable air, and even rocket fuel for missions venturing further into the solar system.",
        "The Moon is also an ideal laboratory. Without a thick atmosphere or strong gravity, telescopes placed there could observe the distant universe with extraordinary clarity. Geologists hope that untouched lunar rocks will reveal new details about how the Earth and Moon formed billions of years ago.",
        "Critics question whether the enormous cost is justified while urgent problems remain on Earth. A single lunar mission can consume the annual budget of a major research institute. Supporters respond that exploration drives innovation: past space programs gave us satellite navigation, water purification systems, and advances in medical imaging.",
        "Perhaps the deepest value lies in cooperation. The new lunar projects involve dozens of countries sharing technology and costs. If humanity can build a sustainable outpost on another world together, it will prove that ambitious goals are still achievable when nations collaborate rather than compete.",
      ],
    },
    {
      title: "Can Renewable Energy Power the World?",
      paras: [
        "Solar panels and wind turbines, once dismissed as expensive toys, have become the cheapest sources of new electricity in many regions. The price of solar power has fallen dramatically over the past decade as manufacturing improved and installations multiplied. Deserts, rooftops, and offshore waters are steadily filling with equipment that harvests energy without burning a single lump of coal.",
        "The fundamental challenge is intermittency. The sun does not always shine, and the wind does not always blow, yet cities demand power at every hour. Engineers are responding with better batteries, smarter grids that shift demand to sunny hours, and long-distance cables that carry electricity from where it is abundant to where it is needed.",
        "No serious plan relies on renewables alone. Most scenarios combine solar and wind with hydropower, geothermal energy in volcanic regions, and improved efficiency that simply wastes less. Nuclear power remains controversial, but some countries count it as a necessary bridge while storage technology matures.",
        "The transition will be gradual and uneven, but its direction seems clear. The question facing each society is no longer whether to shift away from fossil fuels, but how quickly it can manage the transformation without leaving workers and communities behind.",
      ],
    },
  ],
  Environment: [
    {
      title: "A Warming Planet",
      paras: [
        "The Earth's average temperature has risen significantly since the industrial era began, and the primary driver is well understood. Burning coal, oil, and gas releases carbon dioxide that traps heat in the atmosphere like a blanket. Deforestation compounds the problem by destroying forests that would otherwise absorb a large share of these emissions.",
        "The consequences are no longer abstract predictions. Glaciers are retreating, sea levels are creeping upward, and extreme weather events such as heatwaves, floods, and powerful storms are becoming more frequent. Coastal communities face the prospect of relocating entire neighborhoods, while farmers must adapt to shifting rainfall patterns that threaten harvests.",
        "Addressing the crisis requires action on every scale. Governments can set emission limits, invest in public transport, and protect forests. Businesses can redesign products to last longer and waste less. Individuals can reduce air travel, eat more plant-based meals, and vote for policies that reflect the urgency of the situation.",
        "None of these steps alone will reverse warming, but together they determine how severe the outcome becomes. Future generations will judge this decade by whether societies treated climate change as a distant concern or as the defining challenge it has become.",
      ],
    },
    {
      title: "The Disappearing Wild",
      paras: [
        "Species are vanishing at a rate far above the natural background level, and human activity is the overwhelming cause. Forests are cleared for farmland, wetlands are drained for construction, and oceans are emptied by industrial fishing. When a habitat fragments into isolated patches, many creatures can no longer find mates, food, or shelter.",
        "This loss matters for practical reasons, not only sentimental ones. Wild plants are the source of countless medicines, and diverse crops depend on wild relatives for resistance against new diseases. Pollinators such as bees sustain a large share of global food production. Each extinction quietly removes a tool that humanity might desperately need in the future.",
        "Conservation efforts show that recovery is possible. Protected areas, breeding programs, and bans on harmful chemicals have brought several species back from the edge. International agreements now aim to place a substantial portion of land and ocean under protection within this decade.",
        "Protecting biodiversity is ultimately an act of self-interest. A planet with fewer species is more fragile, less productive, and less resilient to shocks. Preserving the variety of life means preserving the options of our own descendants.",
      ],
    },
    {
      title: "The Plastic Tide",
      paras: [
        "Plastic was celebrated as a miracle material: light, durable, and cheap enough to wrap almost anything. Decades later, durability has become the curse. A bag used for twenty minutes can persist in the environment for centuries, slowly fragmenting into microplastics that now appear in drinking water, seafood, and even the air of remote mountains.",
        "Oceans bear the heaviest burden. Rivers carry discarded packaging downstream, where currents gather it into vast floating accumulations. Marine animals mistake fragments for food or become entangled in abandoned nets. Researchers are still investigating how microplastics affect human health, but the precautionary case for reducing exposure is already strong.",
        "Solutions exist at every stage. Redesigning products to use less packaging, expanding refill and reuse systems, and improving collection in developing regions would sharply cut leakage. Several governments have banned the most unnecessary single-use items, proving that regulation can shift corporate behavior faster than voluntary promises.",
        "The deeper lesson concerns our economic model itself. As long as it remains cheaper to produce new plastic than to recycle old, waste will keep flowing. Assigning the true environmental cost to producers may finally turn the tide.",
      ],
    },
  ],
  Health: [
    {
      title: "What Happens in Your Brain While You Sleep",
      paras: [
        "Sleep is not a passive shutdown but an active, highly organized process. During the night, the brain cycles repeatedly between deep sleep and rapid eye movement sleep, each stage performing distinct maintenance tasks. In deep sleep, the body releases growth hormone that repairs tissue, while the brain's waste-clearance system flushes away metabolic debris accumulated during the day.",
        "Dream-rich REM sleep appears essential for emotional regulation and creativity. Studies show that people deprived of this stage struggle to interpret facial expressions and tend to react more strongly to minor frustrations. Memory consolidation also depends on sleep: newly learned vocabulary and skills are replayed by neural circuits overnight, transferring fragile traces into durable long-term storage.",
        "Chronic sleep deprivation therefore impairs far more than alertness. It weakens immune responses, disrupts hormones controlling appetite, and is associated with higher risks of obesity, diabetes, and cardiovascular disease. Even a single week of short nights measurably degrades concentration and decision-making.",
        "The practical implications are straightforward. Keeping consistent bedtimes, dimming lights in the evening, and avoiding screens before bed help preserve the brain's nightly maintenance cycle. Treating sleep as a biological necessity rather than wasted time may be the simplest investment in long-term health.",
      ],
    },
    {
      title: "Stress: Enemy or Ally?",
      paras: [
        "The human stress response evolved as a survival mechanism. When the brain perceives a threat, it floods the body with adrenaline and cortisol, sharpening focus, quickening the pulse, and mobilizing energy. For short challenges such as an examination or a presentation, this reaction genuinely enhances performance.",
        "Problems arise when the alarm never switches off. Chronic stress keeps cortisol elevated for months, suppressing immunity, disturbing digestion, and shrinking regions of the brain involved in memory. Modern triggers such as endless notifications, financial insecurity, and social comparison rarely resolve the way a predator's attack does, so the body remains needlessly mobilized.",
        "Psychologists distinguish between the stressor and our appraisal of it. The same workload can feel crushing or stimulating depending on whether a person believes they have the resources to cope. This is why perceived control, supportive relationships, and adequate rest dramatically change how stress affects health.",
        "Effective management is less about eliminating pressure than about completing the stress cycle. Vigorous exercise burns off mobilized energy, honest conversation signals safety to the nervous system, and sufficient sleep resets hormonal balance. Handled wisely, stress becomes information about what matters rather than a slow form of damage.",
      ],
    },
    {
      title: "Machines That Help Doctors",
      paras: [
        "Medical technology is advancing at remarkable speed. Imaging algorithms can now detect early signs of cancer, eye disease, and fractures on scans with accuracy rivaling experienced specialists. In operating rooms, robotic systems translate a surgeon's hand movements into smaller, steadier motions, enabling procedures through incisions barely wider than a coin.",
        "The greatest promise lies in early diagnosis. Diseases caught in their initial stages are usually cheaper to treat and far less likely to prove fatal. Wearable devices that continuously monitor heart rhythm, blood oxygen, and sleep patterns may soon alert patients to problems long before symptoms appear, shifting medicine from reaction toward prevention.",
        "Enthusiasm must be tempered with caution. Algorithms trained on narrow datasets can perform poorly for underrepresented groups, and overreliance on automated suggestions may erode doctors' own diagnostic skills. Privacy concerns also intensify as intimate health data flows to corporate servers.",
        "The most realistic future pairs machine precision with human judgment. Technology can process millions of images without fatigue, but only a human clinician can understand a patient's fears, values, and life circumstances. The art of medicine will remain human even as its tools become increasingly intelligent.",
      ],
    },
  ],
  Culture: [
    {
      title: "Cities Buried for Thousands of Years",
      paras: [
        "Beneath modern fields and suburbs lie the remains of entire civilizations, waiting patiently for excavation. Archaeologists uncover streets, temples, and ordinary houses layer by layer, reconstructing how ancient people ate, traded, worshipped, and governed themselves. A single well-preserved site can rewrite textbook accounts of when writing emerged or how widely goods traveled.",
        "Artifacts often reveal surprising sophistication. Ancient drainage systems rival modern engineering, while chemical analysis of pottery residues shows trade networks spanning continents. Even garbage pits are treasure troves, preserving seeds, bones, and broken tools that document everyday life far better than monuments built by kings.",
        "Excavation is inherently destructive, however. Digging removes objects from the context that gives them meaning, so documentation must be meticulous. Many countries now restrict foreign expeditions and demand that finds remain in local museums, correcting a colonial legacy in which treasures were shipped to distant capitals.",
        "Preservation faces constant pressure from looting, construction, and mass tourism. Balancing public access with protection requires difficult choices, but the stakes are high: once a site is destroyed, thousands of years of irreplaceable evidence vanish within days.",
      ],
    },
    {
      title: "Why Languages Disappear",
      paras: [
        "Of the roughly seven thousand languages spoken today, a large share are expected to fall silent within this century. The pattern is familiar: younger generations adopt a dominant language for education and employment, while grandparents remain the last fluent speakers of the ancestral tongue. When those elders pass away, an entire worldview can vanish with them.",
        "Each language encodes unique knowledge. Indigenous vocabularies often contain precise terms for local plants, weather patterns, and ecological relationships that have no equivalent elsewhere. Oral traditions carry historical records, moral philosophy, and practical wisdom accumulated over centuries. Linguists argue that losing this diversity impoverishes all of humanity, not only the communities directly affected.",
        "Revitalization efforts offer genuine hope. Communities from Wales to Hawaii have revived languages through immersion schools, broadcasting, and digital tools. Success usually depends less on technology than on prestige: children embrace a language when it connects them to jobs, media, and pride rather than to stigma.",
        "Multilingualism itself is no burden. Research consistently shows cognitive benefits for people who navigate multiple languages. Protecting linguistic diversity ultimately means protecting different ways of thinking, remembering, and imagining the future.",
      ],
    },
  ],
  Education: [
    {
      title: "Schools Are Changing",
      paras: [
        "Education systems designed for the industrial age are under growing pressure to reform. Memorizing facts made sense when information was scarce, but students now carry vast libraries in their pockets. Employers increasingly demand critical thinking, collaboration, and adaptability rather than the ability to recite textbook passages.",
        "Many schools are responding by restructuring lessons around projects and discussion. Instead of listening passively, students investigate real problems, present findings, and critique one another's reasoning. Pilot programs suggest this approach deepens understanding, though it demands far more skill and preparation from teachers.",
        "Technology plays an ambiguous role. Digital tools can personalize practice and connect classrooms across continents, yet screens also distract, and unequal access widens existing gaps. The most successful reforms treat technology as a servant of good pedagogy rather than as a substitute for it.",
        "Assessment remains the hardest puzzle. As long as university admission hinges on a single high-stakes examination, classrooms will teach to that test regardless of official curricula. Genuine reform may therefore require rethinking not only how students learn, but how societies recognize what they have learned.",
      ],
    },
  ],
  Business: [
    {
      title: "The New Way of Working",
      paras: [
        "The traditional office, with its fixed hours and long commutes, is losing its monopoly. Remote work technology has proven that many tasks can be performed anywhere with a reliable connection, prompting millions of employees to reconsider what they expect from their jobs. Flexibility has become one of the most valued features of employment, rivaling salary in surveys.",
        "Companies report mixed results. Productivity often holds steady or improves when workers control their schedules, and firms save substantially on office space. Yet managers struggle to mentor newcomers, sustain creative collaboration, and detect burnout through a screen. Corporate culture, once absorbed unconsciously in hallways, must now be built deliberately.",
        "Experiments with shorter weeks add another dimension. Trials of four-day schedules in several countries found that output remained stable while stress and sick days declined. Critics caution that such results may not transfer to hospitals, factories, or service industries where physical presence is non-negotiable.",
        "The deeper shift concerns the meaning of work itself. Younger generations prioritize purpose, autonomy, and balance over status and overtime pay. Organizations that adapt to these values will attract talent; those that cling to rigid routines may find themselves managing decline.",
      ],
    },
  ],
  Travel: [
    {
      title: "Travel That Does Not Harm Places",
      paras: [
        "Tourism brings income and cultural exchange, but its concentrated form, overtourism, can devastate the destinations it celebrates. Narrow streets clog with crowds, rents soar as apartments convert to short-term rentals, and fragile ecosystems erode under millions of footsteps. Residents of the most affected cities have begun protesting against visitors they once welcomed.",
        "Sustainable travel starts with timing and distribution. Visiting in the off-season, exploring lesser-known regions, and staying longer in one place all reduce pressure on hotspots while spreading economic benefits more evenly. Choosing locally owned accommodation and restaurants ensures that spending reaches the community rather than distant shareholders.",
        "Transport choices matter enormously. Aviation accounts for a significant share of tourism emissions, so travelers can favor trains where practical, take fewer but longer trips, and consider verified offset programs with healthy skepticism. Within destinations, walking, cycling, and public transit minimize both pollution and congestion.",
        "Ultimately, responsible tourism is an attitude of reciprocity. Travelers who learn basic local customs, respect sacred sites, and leave natural areas cleaner than they found them become temporary citizens rather than mere consumers of scenery.",
      ],
    },
  ],
  Sports: [
    {
      title: "Why We Love Watching Sports",
      paras: [
        "Billions of people who rarely exercise themselves follow athletes with passionate devotion. Psychologists explain this paradox through identity: supporting a team provides belonging, shared rituals, and a safe outlet for intense emotion. Victories feel personal even for spectators who never touched the ball.",
        "Sport also delivers narrative drama that scripted entertainment struggles to match. Outcomes are genuinely uncertain, underdogs occasionally triumph, and careers arc across seasons like serialized stories. This unpredictability triggers powerful neurochemical rewards, which helps explain why fans remember specific matches decades later.",
        "The influence extends beyond entertainment. Major tournaments inspire waves of children to try new activities, and Paralympic athletes have profoundly shifted public perceptions of disability. Host cities, meanwhile, gamble that stadiums and infrastructure will regenerate neighborhoods, though economists debate whether the benefits justify the costs.",
        "At its best, sport models values that societies claim to cherish: dedication, fairness, resilience after defeat, and respect for opponents. When those ideals survive commercial pressure, watching a game becomes more than pastime; it becomes a reminder of what collective human effort can achieve.",
      ],
    },
  ],
  DailyLife: [
    {
      title: "The Morning Routine Myth",
      paras: [
        "Social media overflows with identical advice: rise at dawn, meditate, exercise, and journal before the world wakes. Successful founders swear that elaborate morning rituals explain their achievements. The underlying message is seductive: anyone can transform their life simply by copying someone else's schedule.",
        "Sleep researchers offer a skeptical counterpoint. Chronotypes differ substantially between individuals; forcing a natural night owl into a 5 a.m. routine may destroy more productivity than it creates. What matters is total sleep and consistency, not the specific hour of waking. Exhaustion masquerading as discipline helps no one.",
        "Behavioral science suggests a humbler approach. Habits form more reliably when attached to existing routines and kept deliberately small: two push-ups after brushing teeth beats an ambitious gym plan abandoned by February. Environment design outperforms willpower; laying out running shoes the night before works better than motivational slogans.",
        "The most useful question is therefore personal rather than universal. Instead of asking what successful people do at dawn, ask which small arrangement makes your own mornings slightly smoother. Sustainable routines are discovered through experiment, not downloaded from influencers.",
      ],
    },
  ],
};

const GENERIC: Array<{ title: string; paras: string[] }> = [
  {
    title: "Small Habits, Big Changes",
    paras: [
      "Many people aspire to transform their lives, yet ambitious resolutions frequently collapse within weeks. Behavioral research suggests a more reliable strategy: deliberately modest habits that demand minimal motivation. Ten minutes of walking, a few pages of reading, or a small daily saving may appear trivial, but repetition compounds their impact over months and years.",
      "The mechanism is straightforward. When an action is easy, it survives days of fatigue and low spirits that would destroy demanding routines. Each repetition strengthens the associated neural pathway, gradually shifting the behavior from conscious effort to automatic routine. After several weeks, the habit sustains itself, freeing attention for the next incremental improvement.",
      "Setbacks deserve a rational response rather than guilt. Missing a single day barely affects long-term trajectories; abandoning the habit entirely does. Practitioners who resume immediately after lapses consistently outperform perfectionists who interpret one failure as proof of incapacity.",
      "Our lives ultimately reflect what we do repeatedly rather than what we intend occasionally. Modest actions, maintained with quiet persistence, possess a transformative power that dramatic gestures rarely achieve.",
    ],
  },
  {
    title: "The Value of Good Sleep",
    paras: [
      "Sleep constitutes one of the foundations of physical and mental health. During the night, the body repairs tissue, consolidates memories, and recalibrates hormonal balance. Students who sleep adequately concentrate more effectively and retain new material with considerably less effort.",
      "Nevertheless, modern lifestyles systematically undermine rest. Bright screens suppress melatonin, irregular schedules confuse circadian rhythms, and nighttime anxiety keeps minds needlessly alert. The resulting deficit manifests as impaired judgment, volatile mood, and diminished immune function.",
      "Evidence-based countermeasures are refreshingly simple. Maintaining consistent bedtimes, dimming lights in the evening, and keeping bedrooms cool, dark, and quiet substantially improve sleep quality. Caffeine after midday and prolonged late naps should be avoided by anyone struggling to fall asleep.",
      "Time devoted to sleep is not sacrificed productivity but deferred performance. A rested mind accomplishes in hours what an exhausted one cannot finish in days.",
    ],
  },
];

const CLOSERS = [
  "These perspectives may seem demanding, but they reward sustained attention. Readers who revisit the ideas above, perhaps discussing them with others, will find their understanding deepening considerably. Engaging seriously with complex topics is itself a skill, and like any skill, it strengthens with deliberate practice.",
  "It is also worth examining how these ideas connect to personal experience. Abstract arguments become memorable when linked to concrete observations from daily life. Noticing relevant examples in news, conversation, and surroundings transforms passive reading into active learning.",
  "Finally, articulating one's own position consolidates comprehension. Summarizing the article's argument in a few sentences, identifying its strongest evidence, and noting any remaining doubts will reveal both what was understood and what deserves further investigation.",
];

function countWords(paras: string[]): number {
  return paras.join(" ").split(/\s+/).filter(Boolean).length;
}

function scaleToWordCount(paras: string[], target: number): string[] {
  if (countWords(paras) >= target * 0.85) return paras;
  const out = [...paras];
  let ci = 0;
  while (countWords(out) < target * 0.85 && ci < CLOSERS.length) {
    // insert before the last paragraph to keep the conclusion at the end
    out.splice(out.length - 1, 0, CLOSERS[ci % CLOSERS.length]);
    ci++;
  }
  return out;
}

/** All article texts (for dictionary coverage checks). */
export const ALL_TEXTS: string[] = [
  ...Object.values(BANK).flat().flatMap((a) => [a.title, ...a.paras]),
  ...GENERIC.flatMap((a) => [a.title, ...a.paras]),
  ...CLOSERS,
];

export function mockGenerate(topic: string, pastTitles: string[], targetWords: number): { title: string; body: string[] } {
  const pool = [...(BANK[topic] ?? []), ...GENERIC];
  const past = new Set(pastTitles.map((t) => t.toLowerCase()));
  const candidates = pool.filter((a) => !past.has(a.title.toLowerCase()));
  const list = candidates.length > 0 ? candidates : pool;
  const pick = list[hash(topic + "|" + pastTitles.length + "|" + Date.now()) % list.length];
  const body = scaleToWordCount(pick.paras, targetWords);
  return { title: pick.title, body };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
