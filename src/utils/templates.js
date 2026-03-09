/**
 * templates.js — Water4-specific communication templates for each activity type.
 *
 * getTemplate(activityCode, context) returns a structured template object
 * with sections, talking points, and personalized copy.
 *
 * context: { donorName, tier, totalGiving, lastGiftAmount, lastGiftDate, giftCount, giftOfficer, city, state, nth }
 */

import { formatCurrencyFull } from './tiers.js'

// ── Helpers ────────────────────────────────────────────────────────────────

function firstName(fullName = '') {
  return fullName.split(/[\s,&]/)[0] || fullName
}

function sinceMonths(dateStr) {
  if (!dateStr) return null
  const months = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30))
  if (months < 2) return 'last month'
  if (months < 13) return `${months} months ago`
  const yrs = Math.floor(months / 12)
  return `${yrs} year${yrs > 1 ? 's' : ''} ago`
}

// ── Main entry point ───────────────────────────────────────────────────────

export function getTemplate(activityCode, ctx = {}) {
  const name    = firstName(ctx.donorName || ctx.accountName || 'Friend')
  const giving  = ctx.totalGiving ? formatCurrencyFull(ctx.totalGiving) : null
  const last    = ctx.lastGiftAmount ? formatCurrencyFull(ctx.lastGiftAmount) : null
  const since   = sinceMonths(ctx.lastGiftDate)
  const tier    = ctx.tier || 'Donor'
  const officer = ctx.giftOfficer || '[Your Name]'
  const nth     = ctx.nth || 0

  switch (activityCode) {
    case 'call':            return callTemplate(name, giving, last, since, tier, officer, nth)
    case 'email':           return emailTemplate(name, giving, last, since, tier, officer, nth)
    case 'handwritten_note':return noteTemplate(name, giving, last, since, tier, officer, nth)
    case 'meeting':         return meetingTemplate(name, giving, last, since, tier, officer, nth)
    case 'impact_report':   return reportTemplate(name, giving, last, since, tier, officer, nth)
    case 'field_visit':     return fieldVisitTemplate(name, giving, last, since, tier, officer, nth)
    default:                return null
  }
}

// ── Call Script ────────────────────────────────────────────────────────────

function callTemplate(name, giving, last, since, tier, officer, nth) {
  const isYearEnd = nth >= 2
  const isFollowUp = nth >= 1

  return {
    type: 'call',
    title: isYearEnd ? 'Year-End Giving Conversation' : isFollowUp ? 'Relationship Check-In Call' : 'Stewardship Call',
    duration: '10–15 minutes',
    prep: [
      `Review ${name}'s giving history before the call`,
      last ? `Last gift: ${last}${since ? ` (${since})` : ''}` : 'Review giving record',
      giving ? `Lifetime total: ${giving}` : null,
      'Have a specific field story or impact stat ready to share',
      'Know the next gift amount you\'re cultivating toward',
    ].filter(Boolean),
    sections: [
      {
        label: 'Opening',
        time: '0–1 min',
        script: `"${name}, hi — it's ${officer} from Water4. Do you have a few minutes? I've been thinking about you and wanted to connect."`,
      },
      {
        label: 'Purpose',
        time: '1–2 min',
        script: isYearEnd
          ? `"I wanted to reach out personally before the end of the year — partly to say thank you, and partly because I'd love to share what your support has made possible this year."`
          : `"I just wanted to check in, share what's been happening in the field, and hear how things are going on your end."`,
      },
      {
        label: 'Impact Share',
        time: '2–5 min',
        points: [
          'Share one specific story: a community, a family, or a moment from the field — not statistics',
          '"Because of donors like you, [specific community] now has clean water for the first time..."',
          'Connect their giving directly: "Your support last year was part of that."',
          'Have a Water4 impact number ready: wells completed, communities reached, people served YTD',
        ],
      },
      {
        label: 'Listening',
        time: '5–10 min',
        points: [
          `"${name}, I'd love to hear — what drew you to Water4 originally? What keeps you engaged?"`,
          '"How are things going with you? Anything happening in your life or work I should know about?"',
          'Listen for: life changes, giving capacity signals, other causes they care about',
          'Do NOT fill silence — let them talk',
        ],
      },
      ...(isYearEnd ? [{
        label: 'Year-End Ask',
        time: '10–13 min',
        points: [
          last ? `"Last year your gift of ${last} helped make this possible — I'm hoping we can build on that."` : '"I\'d love to talk about how you might partner with us as we finish the year strong."',
          'Name a specific goal: "We have [X] wells left to fund before December 31"',
          'Make a specific ask: "Would you consider a gift of $[AMOUNT] to close out the year?"',
          'Be comfortable with silence after the ask',
        ],
      }] : []),
      {
        label: 'Close',
        time: '13–15 min',
        script: `"${name}, thank you so much for your time — and honestly, for everything you've done for Water4. I'll follow up with [a note / impact update / details on that]. Talk soon."`,
      },
    ],
    notes: `Calls with ${tier} donors should feel like a conversation between equals, not a fundraising pitch. The ask, if any, should feel like a natural next step — not a surprise.`,
  }
}

// ── Email Draft ────────────────────────────────────────────────────────────

function emailTemplate(name, giving, last, since, tier, officer, nth) {
  const subjects = nth === 0
    ? [
        `A personal note from Water4`,
        `The community your gift helped reach`,
        `Thank you, ${name} — and an update from the field`,
      ]
    : [
        `An update from Water4 — thinking of you`,
        `What your partnership has made possible`,
      ]

  const body = nth === 0 ? `Dear ${name},

I wanted to take a moment to write to you personally — not as a form letter, but as a genuine thank-you.

${last ? `Your recent gift of ${last} ` : 'Your generous support '}means that somewhere in the world, a family that used to walk hours for water now has a tap close to home. A woman who spent most of her day collecting water can now run a small business. A girl who missed school because of that walk is sitting in a classroom.

That's not a metaphor. That's what Water4 does on the ground, and your partnership makes it real.

I'd love to share more specifically where your support has gone. [INSERT: specific project, community name, or field story here — check with the program team for a recent example.]

With deep gratitude,
${officer}
Water4` : `Dear ${name},

I've been meaning to write — there's been so much happening in the field, and I wanted you to hear it directly.

[INSERT: 2–3 sentences about a specific Water4 project, community, or impact milestone. Be concrete — name a place, a number, a person if you can.]

Your continued partnership is what makes this work possible. I think about that often.

I'd love to connect soon — would you be open to a brief call in the next few weeks? I have some exciting things to share.

Warmly,
${officer}
Water4`

  return {
    type: 'email',
    title: 'Email Draft',
    subjects,
    body,
    guidance: [
      'Personalize [INSERT] sections before sending — generic emails get deleted',
      'Aim for 150–200 words max — shorter is more likely to be read',
      'Send from your personal email address, not a bulk system',
      'Add a P.S. — it\'s often the most-read line: "P.S. — I\'ll be in [their city] in [month]. Coffee?"',
    ],
  }
}

// ── Handwritten Note ───────────────────────────────────────────────────────

function noteTemplate(name, giving, last, since, tier, officer, nth) {
  const openers = [
    `Dear ${name},`,
    `${name} —`,
    `Dear ${name} and family,`,
  ]

  const bodies = [
    `I've been thinking about you and wanted to say — your partnership with Water4 means more than I can fully express in a note. What you've made possible is real: real communities, real families, real lives changed.`,
    `A moment of gratitude: I was reviewing our impact numbers this week and kept coming back to donors like you who make it all possible. The wells drilled, the communities reached — your name is woven into that story.`,
    `Somewhere in the world today, a child is drinking clean water who wouldn't have been — because of you. I don't say that as a fundraising line. I say it because it's true, and I want you to know it.`,
  ]

  const closings = [
    `With deep appreciation,\n${officer}`,
    `Grateful for your partnership,\n${officer}`,
    `With gratitude,\n${officer} & the Water4 team`,
  ]

  return {
    type: 'handwritten_note',
    title: 'Handwritten Note',
    guidance: [
      'Handwrite this — don\'t type and print. The effort is visible and deeply valued.',
      'Use Water4 notecards or your personal stationery',
      'Keep it to 4–6 sentences — brevity signals confidence',
      'Add one specific detail about their giving if you can (gift amount, project they funded)',
      'Write the envelope by hand too',
    ],
    template: {
      opener:  openers[nth % openers.length],
      body:    bodies[nth % bodies.length],
      closing: closings[nth % closings.length],
    },
    fullText: `${openers[nth % openers.length]}\n\n${bodies[nth % bodies.length]}\n\n${closings[nth % closings.length]}`,
  }
}

// ── Meeting Agenda ─────────────────────────────────────────────────────────

function meetingTemplate(name, giving, last, since, tier, officer, nth) {
  const isSecond = nth >= 1

  return {
    type: 'meeting',
    title: isSecond ? 'Year-End Cultivation Meeting' : 'Relationship Meeting',
    duration: '45–60 minutes',
    format: 'In-person preferred; coffee, their office, or a Water4 visit',
    prep: [
      `Research ${name}: recent news, LinkedIn, any life changes`,
      giving ? `Review giving history — lifetime: ${giving}` : 'Review full giving record',
      'Prepare a specific field update or impact story (not a slideshow — one story)',
      'Know what you\'re cultivating toward: next gift amount, upgrade tier, multi-year pledge',
      'Have any printed materials (annual report, project brief) but don\'t lead with them',
      isSecond ? 'Prepare a specific renewal or upgrade conversation — know your ask' : null,
    ].filter(Boolean),
    agenda: [
      {
        time: '5 min',
        item: 'Welcome & reconnect',
        notes: `Open with a personal question: "How's [family member / work / something personal you know about them]?" Don't rush to business.`,
      },
      {
        time: '10 min',
        item: 'Field update & impact story',
        notes: `Share ONE story from the field — vivid, specific, personal. "I want to tell you about a community we just finished..." Connect their support to the outcome.`,
      },
      {
        time: '15 min',
        item: 'Listening: their perspective',
        notes: `"What's your sense of the work? What questions do you have?" Then be quiet. The best cultivators listen 70% of the time. Learn about their passions, values, and what matters most.`,
      },
      {
        time: '10 min',
        item: isSecond ? 'Year-end vision + ask' : 'Water4\'s vision & next chapter',
        notes: isSecond
          ? `"As we head into next year, I'm hoping we can deepen our partnership. I'd love to explore what a [UPGRADE AMOUNT] commitment might look like for you." Make a specific ask and be comfortable with silence.`
          : `Share what's next for Water4 — new regions, programs, goals. "Where do you see yourself fitting into that vision?" Plant seeds for a deeper partnership.`,
      },
      {
        time: '5 min',
        item: 'Next steps & close',
        notes: `Agree on a next step before you leave: a follow-up call, a piece of information to send, or a date for the next meeting. "I'll send you that project update by Friday."`,
      },
    ],
    followUp: [
      `Send a handwritten note within 24 hours — thank them for their time`,
      `Follow through on every commitment you made in the meeting`,
      `Log the meeting in your CRM with key personal details you learned`,
      `Brief your leadership on anything significant that came up`,
    ],
  }
}

// ── Impact Report ──────────────────────────────────────────────────────────

function reportTemplate(name, giving, last, since, tier, officer, nth) {
  return {
    type: 'impact_report',
    title: nth === 0 ? 'Spring Impact Report' : 'Year-End Impact Report',
    format: 'Email with PDF or printed mailed report for high-tier donors',
    guidance: [
      `For ${tier} donors: consider sending a printed, mailed report — it stands out`,
      'Lead with a story, not a number — numbers in the second paragraph',
      'Include at least one photo if possible',
      'Make it personal: "Because of donors like you, ${name}..."',
      'Offer a call to discuss: "I\'d love to walk you through this — would a brief call work?"',
    ],
    sections: [
      { heading: 'Opening story', notes: 'One vivid story from a specific community or family — 2–3 sentences' },
      { heading: 'Impact numbers', notes: 'Wells completed, communities reached, people with clean water YTD' },
      { heading: 'Program update', notes: 'What regions are active, any new initiatives, program team notes' },
      { heading: 'Financial stewardship', notes: 'Brief note on how funds are managed — donors appreciate accountability' },
      { heading: 'What\'s next', notes: 'Goals for the rest of the year or next year — create anticipation' },
      { heading: 'Personal close', notes: `Direct to ${name}: "Your partnership made this possible — thank you."\nInvite a call or response.` },
    ],
    subjectLines: [
      `Your Water4 impact report — ${nth === 0 ? 'first half of the year' : 'the year in review'}`,
      `What you made possible: Water4 ${nth === 0 ? 'spring' : 'year-end'} update`,
      `A personal update from the field, ${name}`,
    ],
  }
}

// ── Field Visit Invite ─────────────────────────────────────────────────────

function fieldVisitTemplate(name, giving, last, since, tier, officer, nth) {
  return {
    type: 'field_visit',
    title: 'Field Visit / Event Invitation',
    format: 'Phone call first, then written follow-up with details',
    script: `"${name}, I have something I want to ask you — and I think you're going to love it. Water4 is organizing a small donor delegation to [COUNTRY/REGION], and I immediately thought of you. Would you be open to hearing more?"`,
    invitation: {
      subject: `An invitation — Water4 field experience`,
      body: `Dear ${name},

I wanted to reach out about something special. Water4 periodically invites a small group of partners to join us in the field — to see the work firsthand, meet the communities we serve, and understand the full picture of what your support makes possible.

I'd love to extend that invitation to you.

This isn't a fundraising trip. It's an opportunity to witness the transformation that happens when a community gets clean water — the dignity, the hope, the economic ripple effects. Past participants consistently call it one of the most impactful experiences of their lives.

If you're interested, I'd love to get on a call and share the details.

With gratitude,
${officer}
Water4`,
    },
    notes: [
      'Extend this invitation verbally first — the personal ask is more powerful',
      'Not everyone can travel, but the invitation itself deepens the relationship',
      'If travel isn\'t possible, offer a virtual "field experience": a video call with program staff or a community leader',
      'Always personalize with the specific country/region if dates are known',
    ],
  }
}
