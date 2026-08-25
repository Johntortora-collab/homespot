/**
 * One-page leave-behind for a draft listing.
 *
 * Opens a print window with the business's QR, their claim code, and a short
 * explanation of what Homespot is. Built for the case that comes up constantly:
 * the owner isn't in, or is mid-rush, and you need to leave something the
 * manager will actually hand over.
 *
 * Printed rather than emailed on purpose — you rarely get an email address at
 * the door, and a piece of paper by the register survives longer than a message
 * in a shared inbox.
 */

const QR_OPTS = {
  width: 900,
  margin: 1,
  color: { dark: '#000000', light: '#FFFFFFFF' },
  errorCorrectionLevel: 'M',
}

async function qrDataUrl(url) {
  const QRCode = (await import('qrcode')).default
  return QRCode.toDataURL(url, QR_OPTS)
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ))
}

function pageHtml({ name, code, qr, url, town }) {
  return `
  <section class="sheet">
    <header class="head">
      <div class="mark">home<span>spot</span></div>
      <div class="kicker">${esc(town || 'Your town')}</div>
    </header>

    <h1 class="title">Your listing for<br><em>${esc(name)}</em> is ready.</h1>

    <p class="lede">
      Homespot is a local directory — a free listing where neighbours find the
      businesses around them. We've already built yours. Scan to see it.
    </p>

    <div class="scanbox">
      <img class="qr" src="${qr}" alt="QR code" />
      <div class="scanside">
        <div class="scanlabel">Scan to see your listing</div>
        <div class="scanurl">${esc(url)}</div>
        <div class="codebox">
          <div class="codelabel">Your code to go live</div>
          <div class="code">${esc(code || '——————')}</div>
        </div>
        <div class="codenote">
          Tap <strong>Go Live</strong> on the page, enter this code, and you're listed.
          Takes about two minutes.
        </div>
      </div>
    </div>

    <div class="cols">
      <div class="col">
        <div class="colhead">A listing people browse</div>
        <p>Your photo, hours and address in a directory of local businesses.
        No ranking, no paid placement, no star score to defend.</p>
      </div>
      <div class="col">
        <div class="colhead">Know your regulars</div>
        <p>Customers collect stamps on their phone at your counter. You get an
        actual list of who comes back — and who's stopped.</p>
      </div>
      <div class="col">
        <div class="colhead">Reach them directly</div>
        <p>Send an offer to everyone, to your regulars, or just to the people
        who haven't been in for a couple of weeks.</p>
      </div>
    </div>

    <div class="strip">
      <div class="stripitem"><strong>Free.</strong> No fee, no contract, no card on file.</div>
      <div class="stripitem"><strong>No work.</strong> Customers scan a sticker themselves.</div>
      <div class="stripitem"><strong>No ads.</strong> We don't sell your customers' data.</div>
    </div>

    <footer class="foot">
      Nothing is visible to customers until you go live. Pause or edit any time.
      <span class="footurl">${esc(url)}</span>
    </footer>
  </section>`
}

const STYLES = `
  @page { size: letter portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #1A1A2E;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    width: 8.5in; height: 11in;
    padding: 0.7in 0.75in;
    display: flex; flex-direction: column;
    page-break-after: always;
  }
  .sheet:last-child { page-break-after: auto; }

  .head { display:flex; align-items:baseline; justify-content:space-between;
          border-bottom: 2px solid #1A1A2E; padding-bottom: 10px; }
  .mark { font-size: 23px; font-weight: 800; letter-spacing: -0.02em; }
  .mark span { color: #C77F0A; }
  .kicker { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #6B7280; }

  .title { font-size: 34px; line-height: 1.14; font-weight: 800; margin-top: 30px; letter-spacing: -0.02em; }
  .title em { font-style: italic; color: #C77F0A; }

  .lede { font-size: 13.5px; line-height: 1.6; color: #4B5563; margin-top: 13px; max-width: 5.6in; }

  .scanbox { display: flex; gap: 26px; align-items: center; margin-top: 26px;
             border: 2px solid #1A1A2E; border-radius: 12px; padding: 20px 22px; }
  .qr { width: 1.85in; height: 1.85in; display: block; flex-shrink: 0; }
  .scanside { flex: 1; min-width: 0; }
  .scanlabel { font-size: 15px; font-weight: 700; }
  .scanurl { font-size: 10.5px; color: #6B7280; margin-top: 3px; word-break: break-all; }

  .codebox { margin-top: 14px; border: 1.5px dashed #9CA3AF; border-radius: 9px; padding: 10px 13px; }
  .codelabel { font-size: 9.5px; letter-spacing: 0.13em; text-transform: uppercase; color: #6B7280; }
  .code { font-family: 'Courier New', monospace; font-size: 27px; font-weight: 700; letter-spacing: 0.16em; margin-top: 2px; }
  .codenote { font-size: 11px; color: #4B5563; line-height: 1.5; margin-top: 10px; }

  .cols { display: flex; gap: 20px; margin-top: 30px; }
  .col { flex: 1; }
  .colhead { font-size: 13px; font-weight: 700; padding-bottom: 6px; margin-bottom: 7px;
             border-bottom: 1.5px solid #C77F0A; }
  .col p { font-size: 11.5px; line-height: 1.55; color: #4B5563; }

  .strip { margin-top: auto; display: flex; gap: 18px; background: #F5F2ED;
           border-radius: 10px; padding: 14px 16px; }
  .stripitem { flex: 1; font-size: 11px; line-height: 1.5; color: #4B5563; }
  .stripitem strong { color: #1A1A2E; display: block; font-size: 12.5px; margin-bottom: 2px; }

  .foot { margin-top: 16px; padding-top: 11px; border-top: 1px solid #E8E3DC;
          font-size: 10px; color: #6B7280; display: flex; justify-content: space-between; gap: 16px; }
  .footurl { color: #9CA3AF; }
`

/**
 * @param rows  one draft, or an array of them — several print as one document
 *              with a page break between each, so a whole run is one trip to
 *              the printer rather than thirteen.
 */
export async function printFlyers(rows, origin) {
  const list = Array.isArray(rows) ? rows : [rows]
  if (list.length === 0) return

  const pages = []
  for (const row of list) {
    const url = `${origin.replace(/^https?:\/\//, '')}/preview/${row.id}`
    const qr  = await qrDataUrl(`${origin}/preview/${row.id}`)
    pages.push(pageHtml({
      name: row.name, code: row.claim_code, qr, url, town: row.town_name,
    }))
  }

  // Popup blockers allow this because it's inside a click handler. If the
  // window is refused we surface it rather than failing silently — a print
  // button that does nothing is maddening.
  const w = window.open('', '_blank')
  if (!w) throw new Error('Your browser blocked the print window. Allow popups for this site and try again.')

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Homespot — ${list.length === 1 ? esc(list[0].name) : `${list.length} flyers`}</title>
    <style>${STYLES}</style></head><body>${pages.join('')}</body></html>`)
  w.document.close()

  // Images must be decoded before the print dialog opens, or the QR prints
  // blank — the classic version of this bug.
  w.onload = () => {
    setTimeout(() => { w.focus(); w.print() }, 250)
  }
}
