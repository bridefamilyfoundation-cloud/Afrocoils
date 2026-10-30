"""
Builds docs/test-plan/AfroCoils-Test-Cases.pdf, the manual QA test plan.

The cases below are the source: edit them here, then re-export with

    pip install reportlab
    python docs/test-plan/build_test_cases.py

Every expected result is a claim about the code (CLAUDE.md, src/lib/plus.ts,
src/lib/types.ts), so when a section, door, lock or limit changes, change
its case in the same commit, as with the FAQ and /docs.
"""

import datetime
import html
import json
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    CondPageBreak,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, "AfroCoils-Test-Cases.pdf")

# The brand's four, from tailwind.config.js.
CREAM = colors.HexColor("#E8D5C0")
ORANGE = colors.HexColor("#E2583E")
CHOCOLATE = colors.HexColor("#5A2108")
ESPRESSO = colors.HexColor("#3F1708")
PALE = colors.HexColor("#F6EEE6")

# --------------------------------------------------------------------------
# Test cases: (title, preconditions, steps, expected, priority)
# Steps are separated by "|"; they are numbered when drawn.
# --------------------------------------------------------------------------

MODULES = [
    ("SOS", "Launch and Hair SOS (front page)", [
        ("Cold launch with no signal", "Fresh install. Airplane mode on.",
         "Launch the app|Scroll the whole front page",
         "Front page renders fully: collage of three photos, title, one line, Get Started. Fonts, icons and images all load; nothing is blank or broken.", "High"),
        ("Get Started scrolls, not navigates", "App open on front page.",
         "Tap Get Started",
         "Page scrolls down to the doors. Address stays the same; no new screen opens.", "High"),
        ("Exactly two doors", "Front page.",
         "Scroll to the doors|Tap Quick Hairstyle, go back|Tap Hair Care",
         "Only two doors: Quick Hairstyle opens /sos/quick; Hair Care opens /care. No Hair Problem door on this page.", "High"),
        ("One screen at three addresses", "App open.",
         "Open #/ , #/home and #/sos in turn",
         "Same screen at each address, no redirect. SOS tab and drawer Hair SOS entry are selected on all three; the page title is identical.", "Med"),
        ("Locs World pointer for loc wearers only", "Profile hair type set to Loose Natural.",
         "Open front page|Change hair type to Locs in My Hair Profile|Return to front page",
         "No Locs World card with Loose Natural. Card pointing to /locs appears once hair type is Locs.", "High"),
        ("SOS tab stays lit inside its children", "Front page.",
         "Open Quick Hairstyle",
         "SOS tab remains the selected tab on /sos/quick.", "Low"),
        ("Collage is decoration", "TalkBack on.",
         "Swipe through the front page",
         "Collage photos are not announced and are not links; the first focusable target is Get Started.", "Low"),
        ("Quick Hairstyle time bands", "Loose Natural profile.",
         "Open Quick Hairstyle|Select each band in turn",
         "Bands are 5-10 min, 15-20 min, 20-45 min. Each shows only styles inside its time, ranked against the profile, shortest first.", "High"),
        ("Quick Hairstyle for a loc wearer", "Profile hair type Locs.",
         "Open Quick Hairstyle",
         "Empty shelf with a plain message that the library is loose-hair so far. It does not blame the profile and shows no loose-hair styles.", "High"),
    ]),
    ("NAV", "Navigation and structure", [
        ("Bottom bar has four tabs", "Any screen.",
         "Inspect the tab bar|Tap each tab",
         "Tabs are SOS, Styles, Growth, Profile in that order. Only the current tab (orange pill) shows its label; the others are icons with an accessible label.", "High"),
        ("Drawer order and contents", "Any screen.",
         "Open the menu",
         "Entries in order: Hair SOS, Hair Styles, Hair Care, Hair Growth, Locs World, My Hair Profile. No Home entry. About, FAQ, Docs, Privacy, Terms, Contact sit at the base.", "High"),
        ("Old addresses resolve", "App open.",
         "Open #/sos/care|Open #/community|Open #/welcome",
         "/sos/care lands on /care; /community lands on /about; /welcome lands on the front page.", "Med"),
        ("Unknown address", "App open.",
         "Open #/no-such-page",
         "Not-found screen with a way back; app does not crash.", "Low"),
        ("Android back button", "Navigate Front page > Styles > a style.",
         "Press system Back repeatedly",
         "Each press returns one screen; from the front page Back leaves the app.", "Med"),
        ("Hash routing survives reload", "Any inner screen, e.g. /growth.",
         "Reload the WebView (or background the app until it is killed and reopen)",
         "No 404 or blank page; app opens normally.", "Med"),
        ("Distinct page titles", "Web build in a browser.",
         "Visit each section, a guide and a style",
         "Browser tab title changes per route; a guide and a style show their own name.", "Low"),
        ("Breadcrumbs on child screens", "App open.",
         "Open /calendar, /products and /styles/submit",
         "Each shows a section crumb naming its parent and the crumb navigates there.", "Low"),
    ]),
    ("TOUR", "Welcome tour and Docs", [
        ("Tour offered once", "Fresh install.",
         "Launch|Decline the tour|Kill and relaunch the app",
         "Tour is offered on the front page on first launch only; after declining it is not offered again.", "Med"),
        ("Tour runs to the end", "Fresh install.",
         "Accept the tour|Step through every step",
         "11 steps from Welcome to AfroCoils to That is the app. Each spotlights its element or falls back to a centred card; finishing closes the overlay.", "Med"),
        ("Replay from Docs", "Tour already seen.",
         "Open Docs from the drawer|Tap replay tour",
         "Tour starts again from step 1.", "Low"),
        ("Docs match the app", "Docs open.",
         "Read each section and compare with the screens",
         "Section names, doors, tabs and lists (time bands, occasions, climates) match what the app shows.", "Low"),
    ]),
    ("PRO", "My Hair Profile and hair quiz", [
        ("Hair type persists", "Fresh install.",
         "Set hair type to Locs on My Hair Profile|Kill and relaunch",
         "Hair type is still Locs; screens that branch on it reflect it.", "High"),
        ("Hair quiz writes the profile", "Profile empty.",
         "Open the quiz from My Hair Profile|Answer every question|Return to the profile",
         "Answers appear in the profile pickers; completeness meter shows complete.", "High"),
        ("Quiz and meter agree", "Profile partly filled by pickers.",
         "Open the quiz",
         "The quiz asks only for fields the meter counts as missing or offers to change them; meter and quiz agree on 'done'.", "Med"),
        ("Climate is a picker", "Profile open.",
         "Open the climate field",
         "Exactly four options: Humid / tropical, Dry / arid, Cold / low humidity, Temperate. No free text.", "Low"),
        ("Profile photo", "Camera and gallery permissions not yet granted.",
         "Add a profile photo from the camera|Replace it from the gallery",
         "Android asks for permission; photo shows; replacing works; denying permission shows a calm message, no crash.", "Med"),
        ("Loc stage from install date", "Hair type Locs.",
         "Enter a loc install date 2 months ago|Change it to 3 years ago",
         "Loc stage updates from the date (e.g. starter, then mature); it is never typed in.", "Med"),
        ("Data survives an update", "Profile filled on the previous release.",
         "Install the new APK over the old one (or apply a pushed update)",
         "All profile data, length checks, calendar history and photos are intact.", "High"),
    ]),
    ("FORK", "Hair type fork", [
        ("Loc wearer never sees loose technique", "Hair type Locs.",
         "Browse Styles, Recommended, Quick Hairstyle, Quick Hair Check",
         "No loose-hair style appears. Styles says plainly the library is loose-hair so far. The 'My curls are...' group, tangling and breakage are absent from the Quick Hair Check.", "High"),
        ("Loose wearer sees loose content", "Hair type Loose Natural.",
         "Browse the same screens",
         "Styles and the full Quick Hair Check are shown.", "High"),
        ("Calendar default follows hair type", "New calendar, switch hair type between runs.",
         "Open the calendar as Loose Natural, then as Locs",
         "Default schedule differs (e.g. retwist cadence for locs).", "Med"),
    ]),
    ("STY", "Hair Styles", [
        ("Browse by category and occasion", "Loose Natural.",
         "Open Styles|Filter by each category|Filter by each occasion",
         "Occasions are Casual Day, Work/Professional, Formal Event, Gym/Active. Filters narrow the list; clearing restores it.", "High"),
        ("Style detail gallery", "Styles open.",
         "Open a style|Switch Front, Back, Side",
         "Each angle shows its photo, or a placeholder of the same size when missing. Steps are listed.", "High"),
        ("Recommended states its criteria", "Profile filled.",
         "Tap the Recommended button on Styles",
         "Criteria listed: hair type (excludes), length band from the last length check (ranks only), care preferences. Porosity, density and curl pattern are named as not ranking.", "Med"),
        ("Clashing styles are dropped", "Set a care preference a style clashes with.",
         "Open Recommended",
         "The clashing style is absent, not greyed out.", "High"),
        ("Length ranks, never excludes", "Log a short length check.",
         "Compare Recommended before and after",
         "Order may change; no style disappears because of length.", "Med"),
        ("Free shows two recommendations", "Plus not unlocked.",
         "Open Recommended",
         "First 2 styles shown in full; the rest are visible as locked previews that open the Plus sheet.", "Med"),
        ("Generated-picture disclosure", "Styles open.",
         "Read Styles, About and FAQ",
         "Each says the style pictures are generated and that nothing you read is generated.", "Low"),
    ]),
    ("SUB", "Contribute a style", [
        ("Submit button guarded", "Open /styles/submit.",
         "Leave name empty|Enter name, no description|Add description, rights unticked|Tick rights",
         "Submit stays disabled until name (2+ chars), description and the rights tick are all present.", "High"),
        ("Photo limit", "Submit form.",
         "Add photos from camera and gallery until no more are allowed",
         "At most 4 photos; the add control stops at 4.", "Med"),
        ("Offline submit is queued honestly", "Airplane mode on.",
         "Fill the form and submit",
         "Screen says the style is queued on this phone; no success tick. Row shows status Queued with a retry option.", "High"),
        ("Online submit becomes Sent", "Online. A Queued row exists.",
         "Retry the queued row",
         "Row changes to Sent. Retrying again does not create a second submission (same id returned).", "High"),
        ("Server error leaves row Queued", "Simulate 413/429/500 (proxy or oversized photo).",
         "Submit",
         "Error message shown; row stays Queued.", "Med"),
        ("Prefill from lookbook placeholder", "Hair type Locs. Lookbook open.",
         "Tap a plate with no picture",
         "Form opens with the style name shown (not asked) and hair type Locs.", "Med"),
        ("Prefill from My Styles", "A worn style exists on Growth.",
         "Tap Share with the community on it",
         "Form is seeded from that style (?from=).", "Low"),
        ("Withdraw deletes photos", "A queued submission with photos.",
         "Withdraw it|Inspect app storage",
         "Row removed and its photo files deleted.", "Med"),
    ]),
    ("CARE", "Hair Care, guides, Quick Hair Check, products", [
        ("Hub cards", "Hair Care open.",
         "Tap each card",
         "Cards include Hair routine (/calendar), Product recommendations (/products), Hairstyle recommendations (/styles/recommended) and Something is wrong (/sos/problem).", "High"),
        ("Know-your-hair cards read the profile", "Profile filled.",
         "Look at the know-your-hair cards",
         "Each shows the profile value and links to where it is set; there are no pickers on Hair Care.", "Med"),
        ("Porosity test", "Hair Care open.",
         "Run the porosity test to the end",
         "A result is shown and saved to the profile.", "Med"),
        ("Quick Hair Check cautions", "Loose Natural.",
         "Open hair loss, bald patches, receding hairline, scalp bumps",
         "Each shows its caution in full. Three of them show no ingredient list. Nothing claims to diagnose.", "High"),
        ("Quick Hair Check count", "Loose Natural.",
         "Count concerns",
         "24 concerns phrased as symptoms ('my hair is...').", "Low"),
        ("Products name brands, no images", "Products open.",
         "Browse the shelf",
         "Brand names appear here; no packaging photos anywhere.", "Low"),
        ("Deep links open a section", "App open.",
         "Open #/faq?open=<id> and a Products ?open= link",
         "Screen opens scrolled to and expanded on that section.", "Low"),
    ]),
    ("CAL", "Calendar and reminders", [
        ("Next due is derived", "Calendar open.",
         "Log a wash day today",
         "Next due date equals today plus the cadence; changing the cadence moves it.", "High"),
        ("Dates in local time", "Device time zone America/New_York, time 21:00.",
         "Log an event for today",
         "Event lands on today's date, not tomorrow or yesterday.", "High"),
        ("Reminders are Plus", "Plus not unlocked.",
         "Turn on a reminder",
         "Plus sheet opens with the reminders reason; reminder stays off.", "Med"),
        ("Reminder fires", "Plus unlocked.",
         "Turn on a reminder|Grant notification permission|Wait for or fake the due time",
         "Android asks for permission; one notification at the next occurrence (may be inexact). Changing the schedule reschedules it.", "Med"),
    ]),
    ("GRO", "Hair Growth", [
        ("Log a length check", "Growth open.",
         "Add a length check in inches",
         "Entry appears in the history with today's date.", "High"),
        ("Unit is display only", "Two checks logged.",
         "Switch to cm|Switch back to inches",
         "Values convert for display and return to exactly the original inches.", "High"),
        ("Milestones", "Latest check 10 in.",
         "Look at milestones",
         "Neck length (8 in) reached; next is Shoulder length (12 in); later Armpit 16, Bra-strap 20, Mid-back 24, Waist 30.", "Med"),
        ("Plus offered once at second check", "Plus not unlocked, one check logged.",
         "Log a second check|Close the sheet|Log a third check",
         "Sheet offered after the second check only, and not again this launch.", "Med"),
        ("Own data never locked", "Plus not unlocked.",
         "Open Growth",
         "Every length check is readable; only the analysis (retention, ETAs) is locked.", "High"),
        ("Log a trim", "Growth open.",
         "Log a trim",
         "Trim appears in history and retention accounts for it.", "Low"),
        ("Delete a worn style", "A worn style with photos.",
         "Delete it|Inspect storage",
         "Style and its photo files are gone.", "Med"),
    ]),
    ("LOC", "Locs World", [
        ("Own look", "Open /locs.",
         "View the screen",
         "Espresso masthead with cream type and drawn strands, in the brand colours.", "Low"),
        ("Loose or Loc'd? sets hair type", "Hair type Loose Natural.",
         "Choose Loc'd on the opening",
         "Profile hair type becomes Locs.", "Med"),
        ("Free and locked chapters", "Plus not unlocked.",
         "Open every chapter",
         "Basics, Starting, Scalp, Problems and Professional read in full. Others show title, first lines and a lock.", "High"),
        ("Outline sections", "Locs World open.",
         "Open an outline section",
         "Topics drawn as grey chips with a line saying it is not written yet; nothing reads as advice.", "Med"),
        ("Avoid lists", "Locs World open.",
         "Find a things-to-avoid block",
         "Items drawn with a struck marker, not a tick.", "Low"),
        ("Lookbook", "Open /locs/styles.",
         "Scroll the plates|Switch Front, Back, Side",
         "18 numbered plates. Starting locs group free in full; others show front picture and description with a lock. Missing angles are placeholders.", "Med"),
        ("Lookbook deep link", "App open.",
         "Open #/locs/styles?open=<style id>",
         "Opens on that plate.", "Low"),
    ]),
    ("ASK", "Ask", [
        ("Opens two ways", "Any screen.",
         "Tap the Ask button bottom right|Open #/ask",
         "Sheet opens on every screen; /ask is full screen. Neither is in the drawer or tab bar. Nothing is labelled AI.", "High"),
        ("Written answer", "Online or offline.",
         "Ask 'how do I stop breakage'",
         "Written answer with steps, a caution where relevant, a button to the screen where it is done, and the community block.", "High"),
        ("Red-flag question", "Any.",
         "Ask 'I have a bald patch'",
         "Reply leads with the dermatologist line.", "High"),
        ("Off-topic question", "Any.",
         "Ask 'what is the weather'",
         "One calm line back to hair (not understood).", "Med"),
        ("Unanswered hair question", "Any.",
         "Ask an obscure hair question",
         "Says nothing was found without guessing and offers the doors.", "Med"),
        ("Locs question for locs", "Hair type Loose Natural.",
         "Ask 'how often should I retwist my locs'",
         "Answered for locs; if a match was filtered out the screen says so rather than substituting.", "Med"),
        ("Locked chapter in Ask", "Plus not unlocked.",
         "Ask about a Plus-only loc chapter",
         "Result shows title and first line with a lock, not the full passage.", "Low"),
        ("Length cap", "Ask open.",
         "Type more than 160 characters",
         "Input stops at 160.", "Low"),
        ("Works with no signal", "Airplane mode.",
         "Ask a question",
         "Answer appears normally; no error about the network.", "High"),
        ("Conversation not stored", "Sheet has a conversation.",
         "Kill and relaunch",
         "Sheet conversation is gone.", "Low"),
    ]),
    ("PLUS", "AfroCoils Plus (billing in test mode)", [
        ("Rescue is never locked", "Plus not unlocked.",
         "Open Hair SOS, Quick Hairstyle, Hair Care, Quick Hair Check, Ask, Profile, Quiz",
         "No lock or price on any of them.", "High"),
        ("Test-mode purchase", "Plus not unlocked.",
         "Tap any lock|Read the sheet|Unlock",
         "Sheet shows a Test mode banner saying payment is not set up yet. Unlock Plus succeeds without payment and every lock disappears.", "High"),
        ("Unlock persists", "Plus unlocked.",
         "Kill and relaunch",
         "Still unlocked.", "Med"),
        ("Restore in test mode", "Fresh install.",
         "Tap Restore",
         "Says 'Test mode: there's no store to restore from yet.'; nothing unlocks; no crash.", "Low"),
    ]),
    ("UPD", "Updates", [
        ("Check sends nothing", "Traffic proxy on the phone.",
         "Launch the app",
         "One GET of latest.json from the releases bucket: no query string, no profile field, no identifier.", "High"),
        ("Check throttled", "App launched once.",
         "Background and return within 6 hours",
         "No second request inside six hours.", "Low"),
        ("New APK offered, not installed", "latest.json with a higher versionCode.",
         "Launch|Tap Download",
         "Prompt offers the APK; nothing downloads until tapped; Android asks to confirm install.", "High"),
        ("Pushed update", "latest.json with a higher bundle code, minVersionCode met.",
         "Tap Update now",
         "Bundle downloads, SHA-256 verified, app reloads on the new bundle.", "High"),
        ("Tampered bundle rejected", "Manifest SHA-256 does not match the zip.",
         "Tap Update now",
         "Update refused; app stays on the current bundle.", "High"),
        ("Bad bundle rolls back", "Push a bundle that crashes before first render.",
         "Apply it|Relaunch",
         "App rolls back to the previous bundle.", "Med"),
    ]),
    ("PRIV", "Privacy and network", [
        ("Only three requests ever leave", "Traffic proxy. Use every screen for 10 minutes.",
         "Review captured traffic",
         "Only the update GET, Ask question POSTs (sharing on) and style submissions. No analytics, crash reporter, CDN font or Capgo host.", "High"),
        ("Ask sharing payload", "Sharing on. Proxy on.",
         "Ask one question|Press back to replay it",
         "One POST carrying only the words, outcome, matched record and bundle number. Nothing from the profile. No second POST on back.", "High"),
        ("Sharing switched off", "Turn sharing off on About.",
         "Ask questions",
         "No question request is sent. Disclosure under the Ask box still shows.", "High"),
        ("Legal pages offline", "Airplane mode.",
         "Open Privacy, Terms, Contact, About, FAQ",
         "All open from the bundle.", "Med"),
    ]),
    ("A11Y", "Accessibility and layout", [
        ("Screen reader labels", "TalkBack on.",
         "Move through tab bar, drawer and doors",
         "Every control is announced with a meaningful name.", "Med"),
        ("Large text", "Android font size largest.",
         "Visit every section",
         "No clipped or overlapping text; everything reachable.", "Med"),
        ("Small and large phones", "360 dp and 412 dp wide devices.",
         "Visit every section",
         "Layouts fit without horizontal scroll; tab labels fit.", "Med"),
        ("Contrast", "Any.",
         "Check text on orange buttons",
         "Text on orange is bold; headings are chocolate on cream, not orange.", "Low"),
    ]),
    ("API", "Server routes (Supabase functions)", [
        ("Submission accepted as Pending", "Valid submission body.",
         "POST to submissions",
         "200 with an id; the row is stored as Pending, never published automatically.", "High"),
        ("Duplicate client_id", "Same body sent twice.",
         "POST twice",
         "Both return the same id; one row, no orphaned photos.", "High"),
        ("Bad photo refused", "A JPEG with script in metadata, a non-JPEG, a truncated file.",
         "POST each",
         "Rejected; nothing stored.", "High"),
        ("EXIF stripped", "JPEG with GPS EXIF.",
         "POST|Download the stored photo through a signed URL",
         "Stored photo has no EXIF/GPS.", "High"),
        ("Oversized and invalid bodies", "Body over the byte ceiling; malformed JSON.",
         "POST to each route",
         "413 for too large; 400 for invalid.", "Med"),
        ("Rate limit", "Script repeated requests.",
         "POST past the limit",
         "429 once over the limit.", "Med"),
        ("Question recorded", "Valid question body.",
         "POST to questions",
         "204 with no body.", "Med"),
        ("Photo bucket private", "A stored photo path.",
         "Request it without a signed URL",
         "Access denied.", "High"),
    ]),
]

# --------------------------------------------------------------------------

def app_version():
    with open(os.path.join(ROOT, "package.json"), encoding="utf-8") as f:
        return json.load(f)["version"]


styles = getSampleStyleSheet()
base = ParagraphStyle("base", parent=styles["Normal"], fontName="Helvetica",
                      fontSize=8, leading=10, textColor=ESPRESSO)
cell = ParagraphStyle("cell", parent=base)
cell_b = ParagraphStyle("cellb", parent=base, fontName="Helvetica-Bold")
head = ParagraphStyle("head", parent=base, fontName="Helvetica-Bold",
                      textColor=colors.white)
h1 = ParagraphStyle("h1", parent=base, fontName="Helvetica-Bold", fontSize=26,
                    leading=32, textColor=CHOCOLATE)
h2 = ParagraphStyle("h2", parent=base, fontName="Helvetica-Bold", fontSize=14,
                    leading=18, textColor=CHOCOLATE, spaceBefore=6, spaceAfter=6)
body = ParagraphStyle("body", parent=base, fontSize=10, leading=14)
centre = ParagraphStyle("centre", parent=cell, alignment=TA_CENTER)


def P(text, style=cell):
    return Paragraph(text, style)


def boxed(rows, widths, header=True, zebra=True, row_height=None):
    heights = None if row_height is None else [None] + [row_height] * (len(rows) - 1)
    t = Table(rows, colWidths=widths, rowHeights=heights,
              repeatRows=1 if header else 0, hAlign="LEFT")
    cmds = [
        ("GRID", (0, 0), (-1, -1), 0.4, CREAM),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        cmds.append(("BACKGROUND", (0, 0), (-1, 0), CHOCOLATE))
    if zebra:
        for i in range(1 if header else 0, len(rows)):
            if i % 2 == 0:
                cmds.append(("BACKGROUND", (0, i), (-1, i), PALE))
    t.setStyle(TableStyle(cmds))
    return t


def on_page(canvas, doc):
    w, h = landscape(A4)
    canvas.saveState()
    canvas.setFillColor(ORANGE)
    canvas.rect(0, h - 6 * mm, w, 6 * mm, stroke=0, fill=1)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(CHOCOLATE)
    canvas.drawString(12 * mm, 7 * mm,
                      f"AfroCoils {app_version()} - Manual test cases")
    canvas.drawRightString(w - 12 * mm, 7 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build():
    version = app_version()
    today = datetime.date.today().isoformat()
    total = sum(len(cases) for _, _, cases in MODULES)
    story = []

    # Cover
    story += [Spacer(1, 30 * mm), P("AfroCoils", h1),
              P("Manual test cases", ParagraphStyle("sub", parent=h1, fontSize=18,
                                                    leading=24, textColor=ORANGE)),
              Spacer(1, 6 * mm),
              P(f"App version {version} &nbsp;|&nbsp; Android (Capacitor) &nbsp;|&nbsp; "
                f"{total} cases in {len(MODULES)} areas &nbsp;|&nbsp; Generated {today}", body),
              Spacer(1, 10 * mm)]

    run = [[P("Test run", head), P("", head)]] + [
        [P(k, cell_b), P("", cell)] for k in (
            "Tester", "Date", "Device / Android version", "APK versionCode",
            "Bundle code (About)", "Build source (Play / direct APK)",
            "Network conditions used")]
    story.append(boxed(run, [70 * mm, 120 * mm], zebra=False))
    story.append(PageBreak())

    # How to use
    story.append(P("How to use this document", h2))
    for line in (
        "Run each case on a real Android phone with the APK under test unless the case says otherwise. "
        "Mark the Result column <b>P</b> (pass), <b>F</b> (fail), <b>B</b> (blocked) or <b>N/A</b>, "
        "and record a defect number in Notes for every F.",
        "<b>Fresh install</b> means uninstall the app first (which clears its profile). "
        "<b>Plus not unlocked</b> means a fresh install or a profile that has not used the unlock sheet; "
        "billing is in test mode, so unlocking costs nothing and cannot be undone except by reinstalling.",
        "Network cases need a traffic proxy on the phone (e.g. mitmproxy or HTTP Toolkit with its CA installed). "
        "Server cases (API) are run with curl or a script against the production function URL; "
        "do not leave test rows in the queue - delete them after the run.",
        "<b>Priority:</b> High - must pass to release. Med - fix before the next release. Low - cosmetic or rare.",
    ):
        story += [P(line, body), Spacer(1, 3 * mm)]

    # Summary
    story.append(PageBreak())
    story.append(P("Summary", h2))
    srows = [[P(x, head) for x in ("Area", "Prefix", "Cases", "High", "Pass", "Fail", "Blocked")]]
    for prefix, name, cases in MODULES:
        srows.append([P(name), P(prefix), P(str(len(cases)), centre),
                      P(str(sum(1 for c in cases if c[4] == "High")), centre),
                      P(""), P(""), P("")])
    srows.append([P("Total", cell_b), P(""), P(str(total), centre),
                  P(str(sum(1 for _, _, cs in MODULES for c in cs if c[4] == "High")), centre),
                  P(""), P(""), P("")])
    story.append(boxed(srows, [95 * mm, 22 * mm, 20 * mm, 20 * mm, 22 * mm, 22 * mm, 22 * mm]))
    story.append(PageBreak())

    # Cases
    widths = [23 * mm, 38 * mm, 38 * mm, 62 * mm, 72 * mm, 12 * mm, 13 * mm, 15 * mm]
    for prefix, name, cases in MODULES:
        rows = [[P(x, head) for x in
                 ("ID", "Title", "Preconditions", "Steps", "Expected result",
                  "Pri.", "Result", "Notes")]]
        for i, case in enumerate(cases, 1):
            title, pre, steps, expected, pri = (html.escape(x, quote=False) for x in case)
            numbered = "<br/>".join(f"{n}. {s.strip()}" for n, s in
                                    enumerate(steps.split("|"), 1))
            rows.append([P(f"TC-{prefix}-{i:02d}", cell_b), P(title, cell_b), P(pre),
                         P(numbered), P(expected), P(pri, centre), P(""), P("")])
        # Keep an area's heading off the foot of a page.
        story.append(CondPageBreak(45 * mm))
        story.append(P(f"{prefix} - {name}", h2))
        story.append(boxed(rows, widths))
        story.append(Spacer(1, 6 * mm))

    # Defect log and sign-off
    story.append(PageBreak())
    story.append(P("Defect log", h2))
    drows = [[P(x, head) for x in ("Defect #", "Case ID", "Summary", "Severity",
                                   "Steps to reproduce / evidence", "Status")]]
    drows += [[P("")] * 6 for _ in range(8)]
    story.append(boxed(drows, [20 * mm, 22 * mm, 70 * mm, 20 * mm, 110 * mm, 25 * mm],
                       row_height=12 * mm))
    story.append(PageBreak())
    story.append(P("Sign-off", h2))
    sign = [[P(x, head) for x in ("Role", "Name", "Decision (release / hold)", "Signature", "Date")]]
    sign += [[P(r, cell_b), P(""), P(""), P(""), P("")] for r in ("Tester", "Owner")]
    story.append(boxed(sign, [40 * mm, 60 * mm, 60 * mm, 60 * mm, 40 * mm], zebra=False,
                       row_height=14 * mm))

    doc = SimpleDocTemplate(OUT, pagesize=landscape(A4), leftMargin=12 * mm,
                            rightMargin=12 * mm, topMargin=14 * mm, bottomMargin=14 * mm,
                            title="AfroCoils - Manual test cases", author="AfroCoils",
                            subject=f"QA test plan for version {version}")
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"Wrote {OUT} ({total} cases)")


# --------------------------------------------------------------------------
# The one-page sheet for someone who is not a tester: what to try, what
# should happen, in plain words. Each line is a short form of a case above.
# --------------------------------------------------------------------------

QUICK_OUT = os.path.join(HERE, "AfroCoils-Quick-Test-Sheet.pdf")

QUICK = [
    ("Open the app with Wi-Fi and data turned off.",
     "Everything loads: pictures, text and icons. Nothing is blank."),
    ("Tap Get Started on the first screen.",
     "The page scrolls down to two choices: Quick Hairstyle and Hair Care."),
    ("Tap Quick Hairstyle and pick each time option.",
     "Only styles that fit that time show, quickest first."),
    ("Tap each icon in the bottom bar.",
     "Four tabs: SOS, Styles, Growth, Profile. Each opens its page."),
    ("Open the menu (top left).",
     "Hair SOS, Hair Styles, Hair Care, Hair Growth, Locs World, My Hair Profile, then About, Privacy and Contact at the bottom."),
    ("Press the phone's Back button a few times.",
     "It goes back one page each time."),
    ("Fill in My Hair Profile, close the app fully and reopen it.",
     "Everything you entered is still there."),
    ("Take the hair quiz from My Hair Profile.",
     "Your answers appear on your profile."),
    ("Set your hair type to Locs, then look at Styles.",
     "No loose-hair styles show, and the page explains why."),
    ("Open a hairstyle and switch between Front, Back and Side.",
     "Each view shows a picture or a neat empty frame, plus the steps."),
    ("Open Hair Care and tap each card.",
     "Each card opens its own page."),
    ("In Hair Care, open Something is wrong and choose 'hair loss'.",
     "A clear warning to see a professional is shown."),
    ("Add a length check on Growth, then switch inches/cm and back.",
     "The number converts and comes back exactly the same."),
    ("Log a wash day in the Calendar.",
     "It shows on today's date and the next one is worked out for you."),
    ("Open Locs World and its lookbook.",
     "A dark page with numbered loc styles and Front / Back / Side views."),
    ("Tap the Ask button (bottom right) and type a hair question.",
     "A written answer with a button to the right page."),
    ("Ask something unrelated, like 'what's the weather?'",
     "A short, polite line steering you back to hair."),
    ("Ask a question with Wi-Fi and data off.",
     "You still get an answer."),
    ("Tap a lock icon and choose Unlock Plus.",
     "A Test mode note shows, it unlocks for free, and the locks disappear."),
    ("Share a style from Styles with the internet off.",
     "The app says it is saved on your phone and waiting to send. It does not say it was sent."),
    ("Make the phone's text size as large as possible.",
     "Text still fits and nothing overlaps."),
    ("Open About, Privacy, Terms and Contact.",
     "Each page opens and reads properly."),
]


def build_quick():
    version = app_version()
    big = ParagraphStyle("qbody", parent=base, fontSize=9.5, leading=12)
    big_b = ParagraphStyle("qbodyb", parent=big, fontName="Helvetica-Bold")
    big_head = ParagraphStyle("qhead", parent=big, fontName="Helvetica-Bold",
                              textColor=colors.white)
    rows = [[P("", big_head), P("What we are testing", big_head),
             P("Expected result", big_head)]]
    rows += [[P(str(i), big_b), P(html.escape(what), big), P(html.escape(expect), big)]
             for i, (what, expect) in enumerate(QUICK, 1)]

    story = [
        P("AfroCoils - quick test sheet",
          ParagraphStyle("qt", parent=h2, fontSize=16, leading=20, spaceBefore=0)),
        P(f"Version {version}. Try each thing on the left. If what happens does not match "
          "the right-hand column, note the number and tell the team what you saw.", body),
        Spacer(1, 4 * mm),
        boxed(rows, [8 * mm, 86 * mm, 92 * mm]),
    ]

    def page(canvas, doc):
        w, h = A4
        canvas.saveState()
        canvas.setFillColor(ORANGE)
        canvas.rect(0, h - 5 * mm, w, 5 * mm, stroke=0, fill=1)
        canvas.restoreState()

    doc = SimpleDocTemplate(QUICK_OUT, pagesize=A4, leftMargin=12 * mm,
                            rightMargin=12 * mm, topMargin=11 * mm, bottomMargin=8 * mm,
                            title="AfroCoils - quick test sheet", author="AfroCoils")
    doc.build(story, onFirstPage=page, onLaterPages=page)
    print(f"Wrote {QUICK_OUT} ({len(QUICK)} checks)")


if __name__ == "__main__":
    build()
    build_quick()
