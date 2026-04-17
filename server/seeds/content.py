"""English content pools for the dev seed.

All text is hand-written — no Faker, no Lorem. Entries carry emotional grain
(fear, pride, doubt, tiredness) and realistic operator language.
"""

from __future__ import annotations

from dataclasses import dataclass

from models.journal_entry import JournalMood

# ---------------------------------------------------------------------------
# Journal entries — 3 "showcase" entries with grain
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class JournalSpec:
    mood: JournalMood
    body: str


SHOWCASE_JOURNAL_ENTRIES: list[JournalSpec] = [
    JournalSpec(
        mood=JournalMood.low,
        body=(
            "I almost didn't send this week's payment. Not because I didn't have the money — "
            "I did — but because part of me was testing whether she'd notice, whether it "
            "actually mattered. I sat with my phone for maybe twenty minutes before I "
            "transferred it. The moment it went through I felt something close to relief, "
            "which surprised me. I think what I'm really afraid of is that I'm replaceable. "
            "That if I disappeared from her list she wouldn't lose sleep over it. Maybe that's "
            "the point. Maybe the discipline is supposed to feel like this — voluntary, costly, "
            "slightly frightening. I don't know. I just know I sent it, and I'll send it again "
            "next Monday."
        ),
    ),
    JournalSpec(
        mood=JournalMood.great,
        body=(
            "She approved the contract extension this morning. I've been waiting three weeks "
            "for that. I know it sounds absurd to be proud of being allowed to keep paying, but "
            "that's exactly what I feel. I cleared the arrears from February without being "
            "asked twice. I made all four payments on time this quarter. I built a spreadsheet "
            "tracking every transfer down to the penny — not because she asked but because I "
            "needed to see my own reliability reflected somewhere. Today it paid off. She wrote "
            "two lines in the approval note: 'Consistent. No drama.' I've read those four words "
            "probably twelve times. That's it. That's the whole reward. It's enough."
        ),
    ),
    JournalSpec(
        mood=JournalMood.overwhelmed,
        body=(
            "Rough week. Work deadlines collided with the tribute date and I had to email "
            "asking for a 48-hour grace. I hate asking. I spent an embarrassing amount of time "
            "writing that email — three drafts, each one trying to sound like I wasn't "
            "panicking. She replied in six minutes with 'Fine. 48 hours. Don't make it a "
            "habit.' I'm still not sure if I'm grateful or ashamed. Probably both. I paid on "
            "day two, not day one, and left a note explaining. She read it and left no comment. "
            "That silence is doing something to me I can't fully name. I feel like I used up "
            "something I can't easily earn back. I'll probably not ask again."
        ),
    ),
]


# ---------------------------------------------------------------------------
# Journal entry bodies organised by sub — longer pools for variety
# ---------------------------------------------------------------------------


CHRIS_JOURNAL_BODIES: list[JournalSpec] = [
    JournalSpec(
        mood=JournalMood.good,
        body=(
            "Monday payment sent. Revolut confirmed in under a minute. I've started keeping a "
            "note in my phone for each one — date, method, amount. Feels important to have my "
            "own record even though she tracks everything on her end."
        ),
    ),
    JournalSpec(
        mood=JournalMood.neutral,
        body=(
            "Nothing remarkable this week. Paid, logged it, moved on. I think the consistency "
            "is the point. Seventeen weeks in a row now. There's something meditative about the "
            "routine — it asks nothing of me except reliability."
        ),
    ),
    JournalSpec(
        mood=JournalMood.good,
        body=(
            "The collar selfie ritual is holding. I keep thinking I'll forget one morning and "
            "then feel oddly anxious until I've sent it. That anxiety is interesting — it's not "
            "fear of punishment exactly, more like the discomfort of not completing something "
            "I've promised."
        ),
    ),
    *SHOWCASE_JOURNAL_ENTRIES[:1],
    JournalSpec(
        mood=JournalMood.great,
        body=(
            "Contract milestone: balance crossed below £400 this week. I ran the numbers — "
            "if I keep to minimum payments plus one bonus a month, I clear it by August. "
            "Showing her the spreadsheet felt presumptuous but she seemed to approve. 'On track' "
            "was all she said. Good enough."
        ),
    ),
    JournalSpec(
        mood=JournalMood.neutral,
        body=(
            "Sent the PayPal this time. She prefers Revolut but I was travelling and PayPal "
            "was the only option. Left a note explaining. No response, which I'm taking as "
            "acceptance rather than annoyance."
        ),
    ),
    JournalSpec(
        mood=JournalMood.low,
        body=(
            "Had a bad dream where I missed three weeks in a row. Woke up and immediately "
            "checked the calendar. Next payment isn't due until Monday. Everything is fine. "
            "The dream rattled me more than it should have."
        ),
    ),
    JournalSpec(
        mood=JournalMood.good,
        body=(
            "Sent a bonus £150 this week. No particular occasion — I'd had a good month at "
            "work and wanted to do something with the surplus that felt meaningful. She marked "
            "it goddess_recorded with a note. I didn't see the note but knowing it exists is "
            "enough."
        ),
    ),
    *SHOWCASE_JOURNAL_ENTRIES[1:2],
    JournalSpec(
        mood=JournalMood.neutral,
        body=(
            "IBAN transfer this week instead of Revolut. Slower but the reference field lets "
            "me add a note. I always put my username and the date so there's no ambiguity on "
            "her side. Small but satisfying."
        ),
    ),
    JournalSpec(
        mood=JournalMood.good,
        body=(
            "Twenty weeks. I calculated that since October I've transferred £1,760 in rolling "
            "tributes alone, not counting contract payments. That number surprised me. It also "
            "pleased me in a way I find difficult to explain to people outside this."
        ),
    ),
    JournalSpec(
        mood=JournalMood.good,
        body=(
            "Week twenty-two. The chain is unbroken. I don't know if she tracks streaks but I "
            "do. This one matters to me."
        ),
    ),
]


DAN_JOURNAL_BODIES: list[JournalSpec] = [
    JournalSpec(
        mood=JournalMood.neutral,
        body=(
            "First payment sent. £120 via PayPal. She confirmed it within two hours. "
            "I'd been nervous about the process — worried something would go wrong technically "
            "— but it was straightforward."
        ),
    ),
    JournalSpec(
        mood=JournalMood.low,
        body=(
            "Missed the deadline by four days. Life situation, nothing I want to put in "
            "writing. She applied a late fee without warning. I'm not angry about it — the "
            "terms were clear — but it stings."
        ),
    ),
    JournalSpec(
        mood=JournalMood.neutral,
        body=(
            "Paid up including the late fee. She noted it was accepted. Relationship feels "
            "transactional at the moment, which is maybe appropriate given the circumstances."
        ),
    ),
    *SHOWCASE_JOURNAL_ENTRIES[2:3],
    JournalSpec(
        mood=JournalMood.low,
        body=(
            "Second late fee. I knew it was coming. I don't have a good reason. I'm trying to "
            "understand why I keep letting it slip when I clearly have the funds. Something "
            "to figure out."
        ),
    ),
    JournalSpec(
        mood=JournalMood.neutral,
        body=(
            "Contract is at about 15% repaid. Long road ahead. I'm not sure I thought this "
            "through. But backing out feels worse than continuing."
        ),
    ),
]


BEN_JOURNAL_BODIES: list[JournalSpec] = [
    JournalSpec(
        mood=JournalMood.great,
        body=(
            "First screenshot sent for the entry tribute. I submitted it via sub_declared. "
            "She validated it in under an hour. Fast. Professional. Good start."
        ),
    ),
    JournalSpec(
        mood=JournalMood.overwhelmed,
        body=(
            "Screenshot rejected — 'illegible.' I had photographed my phone screen in bad "
            "light. Resent a proper export. Slightly mortifying."
        ),
    ),
    JournalSpec(
        mood=JournalMood.good,
        body=(
            "Both rituals confirmed active: daily report and weekly orgasm log. The daily "
            "report takes me about ten minutes every evening. I'm finding it unexpectedly "
            "clarifying — forces me to account for my day."
        ),
    ),
    JournalSpec(
        mood=JournalMood.neutral,
        body=(
            "£640 is a heavy rolling. I knew the number when I agreed to it. "
            "Managing cash flow around it takes actual planning."
        ),
    ),
    JournalSpec(
        mood=JournalMood.low,
        body=(
            "Three weeks since last payment. Not good. I have the money. I'm procrastinating "
            "and I don't fully understand why. The adjustment request is still pending — maybe "
            "I'm waiting for that to clear before I pay. That's not a real reason."
        ),
    ),
    JournalSpec(
        mood=JournalMood.neutral,
        body=(
            "The dispute is open. I'm not sure how long these take to resolve. "
            "In the meantime I sent what I owed for the previous cycle."
        ),
    ),
    JournalSpec(
        mood=JournalMood.neutral,
        body=(
            "Went back through my kink ratings this week. 22 items rated across five "
            "categories. Pup-play sits at fetish_need. I've never said that out loud to anyone. "
            "Having it logged somewhere official is strange. Good strange."
        ),
    ),
    JournalSpec(
        mood=JournalMood.low,
        body=(
            "Second screenshot rejection for the March payment. 'Photo blurred.' I took it "
            "while I was rushing. I need to slow down."
        ),
    ),
    JournalSpec(
        mood=JournalMood.overwhelmed,
        body=(
            "Seven days late as of today. The rolling penalty is accruing. I know it. "
            "I'm writing this before I send the payment — accountability to future self. "
            "Transfer goes tonight."
        ),
    ),
]


ELI_JOURNAL_BODIES: list[JournalSpec] = [
    JournalSpec(
        mood=JournalMood.good,
        body=(
            "Second month in. Things feel stable. I've been honest about every payment — "
            "to the penny — and it's made the dynamic cleaner."
        ),
    ),
    JournalSpec(
        mood=JournalMood.neutral,
        body=("Rolling month. Nothing outstanding. Paid on time. No notes from her side."),
    ),
    JournalSpec(
        mood=JournalMood.low,
        body=(
            "Lied about a transfer. I told her it had been sent when it hadn't. "
            "I don't know why. The money was there. I just said it was done and it wasn't. "
            "She'll find out when she checks. I should correct this before she does."
        ),
    ),
    JournalSpec(
        mood=JournalMood.bad,
        body=(
            "She found out. Of course she did. I don't think there's anything I can say "
            "that makes this better. I'm going to wait and see what happens."
        ),
    ),
]


# ---------------------------------------------------------------------------
# Payment rejection reasons
# ---------------------------------------------------------------------------


REJECT_REASONS: list[str] = [
    "Photo blurred — please retake the screenshot at full brightness and resubmit.",
    "Wrong amount. You sent £75, not £80. Correct the transfer and upload a new screenshot.",
    "I asked Revolut, not PayPal. Reverse this and use the correct method.",
    "Screenshot does not show the transaction date. Resubmit with date visible.",
    "Reference missing your username. Cannot match this to your account.",
]


# ---------------------------------------------------------------------------
# Review-queue motivation phrases (sub-side, for kink/limit/profile requests)
# ---------------------------------------------------------------------------


REVIEW_QUEUE_MOTIVATIONS: list[str] = [
    "I'd like to update my pup-play rating to fetish_need — it's been accurate for months "
    "and I want my profile to reflect that honestly.",
    "Asking to relax the rope bondage soft limit to curious. I've done more research and "
    "spoken to people with experience. I'm ready to explore this carefully.",
    "Requesting a display name correction — I misspelled it at signup and it's been "
    "bothering me. No other changes.",
]


# ---------------------------------------------------------------------------
# Mantra snippets (used in sub profile / onboarding copy)
# ---------------------------------------------------------------------------


MANTRAS: list[str] = [
    "Every transfer is a choice I make freely.",
    "Consistency is the tribute she didn't have to ask for.",
    "I pay because I chose this. I chose this because it matters.",
]
