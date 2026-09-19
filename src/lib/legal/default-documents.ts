import { LegalDocumentKind } from "@/generated/prisma/enums"

/**
 * The wording each legal document ships with.
 *
 * This is the starting point, not the source of truth: the first time an
 * administrator opens a document in Settings → Legal documents it is copied
 * into the database, and from then on the dealership's own edits are what the
 * site publishes. Until that happens the public page renders this text, so a
 * fresh deployment is never without its terms.
 *
 * Written for this business as it actually operates — vehicles sourced in
 * Japan, South Korea and China, shipped through Mombasa and delivered in
 * South Sudan; parts sold by quotation; payments by bank transfer and mobile
 * money, verified by hand. `{{placeholders}}` are filled from Settings (see
 * legal-text.ts), so a rename or a change to the payment split never leaves a
 * document out of date.
 *
 * It is a professionally structured draft, not legal advice. The dealership
 * should have it reviewed by a lawyer qualified in South Sudan before relying
 * on it, and can change any section in the dashboard afterwards.
 */

export interface DefaultLegalSection {
  heading: string
  body: string
  /** Hidden sections are installed but not published until switched on. */
  isVisible?: boolean
}

export interface DefaultLegalDocument {
  kind: LegalDocumentKind
  title: string
  summary: string
  sections: DefaultLegalSection[]
}

/* ─────────────────────────────────────────────────────────────────────
 * Terms of Sale
 * ──────────────────────────────────────────────────────────────────── */

const TERMS_OF_SALE: DefaultLegalDocument = {
  kind: LegalDocumentKind.TERMS_OF_SALE,
  title: "Terms of Sale",
  summary:
    "These terms explain how buying a vehicle or spare parts from {{business_name}} works — from your quotation and staged payments to shipping, delivery, cancellations and refunds. Please read them before you accept a quotation. Your quotation and order confirmation set out the details specific to your purchase.",
  sections: [
    {
      heading: "About these terms",
      body: `These Terms of Sale apply to every purchase of a vehicle or spare parts from {{company}} ("we", "us", "our"), by a customer ("you").

They apply together with the quotation we send you and the order confirmation that follows it. If your quotation or order confirmation says something different from these terms, the quotation or order confirmation applies to your purchase.

Your use of our website is covered separately by our Terms of Use, and the way we handle your personal information is explained in our Privacy Policy.`,
    },
    {
      heading: "Words we use",
      body: `- **Quotation** — the written offer we send you, stating the vehicle or parts, the agreed price and what it includes.
- **Order** — a quotation you have accepted and we have confirmed in writing. Every order has an order number beginning CLM-O.
- **Agreed Price** — the total stated in your quotation, in US dollars.
- **Vehicle** — the vehicle described in your quotation, including any documents that come with it.
- **Parts** — spare parts, accessories and other goods described in your quotation.
- **Delivery Point** — the place stated in your quotation where you collect the vehicle or parts, or where we deliver them.
- **Business Day** — Monday to Friday, excluding public holidays in South Sudan.`,
    },
    {
      heading: "Listings, prices and availability",
      body: `We describe each vehicle and part as accurately as we can, using the seller's details, auction sheets, inspection reports and our own photographs. Minor differences in colour or appearance can occur between photographs and the vehicle itself.

Prices on the website are shown in US dollars. A listing price is the price of the vehicle or part itself; shipping, clearing and other costs are confirmed in your quotation. Any cost described as an estimate is not final until it appears in a quotation.

Many of our vehicles are sourced from auctions and dealers abroad and may be sold to other buyers at any time. A vehicle is only held for you once your order is confirmed and your initial payment has been received.

If we discover an obvious error in a price or description, we will tell you and correct it before your order is confirmed. You may then choose whether to continue.`,
    },
    {
      heading: "Quotations",
      body: `Asking for a quotation is free and does not commit you to buy anything.

Your quotation states the Agreed Price and what it includes — for example the vehicle, shipping to Mombasa, port and clearing charges, transport to South Sudan and any other costs listed. It is valid for the period stated on it. After that period we may need to re-quote, because auction prices, freight rates and exchange rates change.

A quotation is an offer, not an order. Nothing is reserved or purchased until you accept the quotation and we confirm your order in writing.`,
    },
    {
      heading: "Placing and confirming your order",
      body: `You accept a quotation by telling us in writing (by email or WhatsApp) that you wish to proceed. We then confirm your order by sending an order confirmation with your order number and your payment schedule. A binding contract between us is formed when we send that confirmation.

We may decline an order — for example if the vehicle is no longer available, if the details you gave us cannot be verified, or if we are unable to export or import the vehicle lawfully. If we decline, you owe us nothing and any money you have already paid for that order is refunded in full.

Please check your details carefully. The name you give us is the name that will appear on the invoice and export documents, and it is difficult and sometimes costly to change it after shipping.`,
    },
    {
      heading: "What the price includes",
      body: `The Agreed Price covers the items listed in your quotation, and only those items.

Unless your quotation says otherwise, the Agreed Price does not include:
- South Sudan import duty, taxes and levies payable on arrival;
- vehicle registration, number plates and road licences in South Sudan;
- vehicle insurance after handover;
- storage charges that arise because a payment is late or the vehicle is not collected on time (see "Collection and handover");
- delivery beyond the Delivery Point.

If a government authority introduces or changes a tax, duty or official charge after your order is confirmed and that charge applies to your vehicle, we will pass on the change at cost and show you the evidence before asking you to pay it.`,
    },
    {
      heading: "Vehicle payment schedule",
      body: `Vehicles are paid for in three stages, so that you never pay the full price before your vehicle has reached the region:

1. **Initial payment — {{initial_payment}} of the Agreed Price**, when your order is confirmed. We begin buying, inspecting and shipping your vehicle once this payment has been received and verified.
2. **Mombasa payment — {{mombasa_payment}} of the Agreed Price**, when your vehicle arrives at the port of Mombasa, Kenya.
3. **Final payment — {{final_payment}} of the Agreed Price**, before your vehicle is released and handed over to you.

The full Agreed Price must be paid before a vehicle is handed over. The exact percentages and amounts for your order are shown in your order confirmation; if they differ from the schedule above, your order confirmation applies.

We will tell you by email or WhatsApp when each payment falls due, and your order's progress is always visible on the Track My Order page once tracking is active. Each payment is due within 7 days of our notice unless we agree another date in writing.

If a payment is late, your vehicle may be held at the port or in storage until it is received, and any storage, demurrage or port charges caused by the delay are payable by you. If a payment remains unpaid 30 days after we have reminded you in writing, we may treat the order as cancelled by you (see "Cancelling an order").`,
    },
    {
      heading: "How to pay",
      body: `We accept payment by bank transfer and mobile money, into the official accounts of {{legal_name}} only. Those accounts are printed on your quotation and order confirmation and listed on our Payment Safety page.

Please include your order number as the payment reference, and send us the transaction reference or a copy of the receipt once you have paid.

A payment only counts towards your order once we have verified that the money has been received and confirmed it to you in writing. Until then it is shown as "under verification".

Bank charges, transfer fees and mobile-money fees charged by your own provider are your responsibility.

**We will never ask you to pay into a personal account, and we will never change our payment details by WhatsApp, text message or phone call.** If you receive such a request, do not pay — contact us on {{phone}} first. We cannot accept responsibility for money paid into an account that is not one of our official accounts.`,
    },
    {
      heading: "Sourcing, inspection and condition",
      body: `Most vehicles we sell are used vehicles imported from Japan, South Korea or China. We describe each vehicle using the auction sheet, exporter's inspection or our own inspection, together with photographs.

Recorded mileage is the figure reported by the auction house, exporter or previous owner. We check it where records allow, but cannot guarantee the mileage of a used vehicle beyond those records.

A used vehicle shows wear consistent with its age and mileage. Inspections cannot always reveal hidden mechanical or electrical faults, and we are not responsible for faults that were not reasonably detectable when the vehicle was inspected.

If, before the vehicle is shipped, we discover damage or a fault that is significantly worse than described in your quotation, we will tell you and you may choose to:
- continue with the purchase;
- choose another vehicle, with any difference in price adjusted; or
- cancel the order and receive a full refund of what you have paid for it.

Unless your quotation states that a warranty is included, vehicles are sold without a warranty, except for any rights that cannot be excluded by law.`,
    },
    {
      heading: "Shipping, clearing and delivery times",
      body: `Vehicles are shipped from the country of purchase to the port of Mombasa, Kenya, cleared there, and transported by road to South Sudan. Parts may be sent by sea, air or road depending on their size and urgency.

Any delivery date or time we give you is our honest estimate based on current shipping schedules. It is not guaranteed. Shipping and delivery can be delayed by events outside our control, including vessel schedules, weather, port congestion, customs inspections, changes in regulations, border closures, road conditions, insecurity and strikes.

We will keep you informed of significant delays and do everything reasonable to limit them. A delay outside our control does not entitle either of us to cancel the order, unless the delay exceeds 90 days beyond the estimated delivery date, in which case either of us may cancel and any payments you have made are refunded, less costs we have already paid to third parties on your behalf and cannot recover (which we will itemise).`,
    },
    {
      heading: "Tracking your order",
      body: `Once your initial payment has been verified we issue a tracking number and send it to you. You can enter it on our Track My Order page at any time to see your order's current stage, location and expected delivery window.

Tracking information is provided in good faith and updated by our team as your order progresses. Dates shown are estimates unless they record a stage that has already happened.

Please keep your tracking number private. The tracking page does not show your name, contact details or payments, but anyone with the number can see where your order is.`,
    },
    {
      heading: "Collection and handover",
      body: `We will notify you when your vehicle or parts are ready for collection at the Delivery Point, or arrange delivery if your quotation includes it.

To release a vehicle we need:
- payment of the full Agreed Price, and any other charges due under these terms;
- valid identification matching the name on the order, or a signed authority from the buyer naming the person collecting.

Please inspect the vehicle or parts when you collect them, and tell us before you sign the handover note about any damage or missing items. We will ask you to sign a handover note confirming collection.

Please collect within 14 days of our notice. After that, storage charges may apply at the rate we tell you in advance. If a vehicle has not been paid for and collected within 90 days of our written notice, and you have not replied to our reminders, we may, to the extent permitted by law, resell it to recover the amounts owed, and refund you anything remaining after our costs.`,
    },
    {
      heading: "Ownership and risk",
      body: `Ownership of a vehicle or parts passes to you once the Agreed Price and any other charges due have been paid in full.

Your quotation states whether the Agreed Price includes marine or transit insurance. Where it does, we arrange that cover and, if the vehicle is lost or damaged in transit, we pursue the claim for you and pass on the proceeds. Where it does not, the risk of loss or damage in transit passes to you when the vehicle is loaded for shipping, and we recommend that you arrange cover.

Risk passes to you in every case when the vehicle or parts are handed over to you or to the person you authorise.`,
    },
    {
      heading: "Cancelling an order",
      body: `You can cancel an order by telling us in writing. What you are refunded depends on how far your order has progressed:

- **Before your initial payment** — you can cancel at no cost.
- **After your initial payment, before we have bought the vehicle** — we refund what you have paid, less any non-refundable costs we have already incurred on your behalf (such as auction or deposit fees and inspection costs), which we will itemise.
- **After we have bought the vehicle** — the order cannot be cancelled free of charge, because the vehicle has been bought for you. If you still wish to cancel, we will try to resell the vehicle and refund what you have paid, less our costs and any loss on resale.

Parts ordered specially for you on request (items quoted rather than held in stock) cannot be cancelled once we have ordered them from our supplier.`,
    },
    {
      heading: "If we cancel an order",
      body: `We may cancel an order if the vehicle or parts become unavailable, cannot be exported or imported lawfully, or are lost before shipping. If this happens we will tell you promptly and either offer you a comparable alternative, if you want one, or refund in full everything you have paid for that order.`,
    },
    {
      heading: "Refunds",
      body: `Refunds are paid in US dollars to the account or mobile-money number the original payment came from, unless we agree another method in writing.

We aim to pay refunds within 14 Business Days of agreeing the amount. Any fees charged by your bank or mobile-money provider to receive the refund are deducted by them, not by us.

Every refund is recorded against your order and confirmed to you in writing.`,
    },
    {
      heading: "Spare parts",
      body: `**Prices.** Some parts have a fixed price shown on the website; others are sourced on request and priced in a quotation. Adding a part to your list on the website does not reserve it or fix its price — the price is confirmed in your quotation.

**Payment.** Parts orders are paid in full before they are packed and dispatched, unless your quotation says otherwise.

**Fitment.** We match parts to vehicles by make, model, year and engine. Because manufacturers make running changes, please confirm the part number, or send us your vehicle's chassis (VIN) number, before ordering. We are not responsible for a part that does not fit because the vehicle details we were given were incorrect.

**Returns.** You may return a part within 7 days of collection if:
- we supplied the wrong part for the vehicle details you gave us; or
- the part is faulty on arrival.

Returned parts must be unused, uninstalled and in their original packaging. We will replace the part or refund its price. Parts ordered specially on request, electrical parts that have been fitted, and parts damaged by incorrect installation cannot be returned unless they are faulty.`,
    },
    {
      heading: "Documents",
      body: `With each vehicle we provide the documents we receive for it, which normally include the commercial invoice, export or deregistration certificate and bill of lading, and any other documents your quotation lists.

Registering the vehicle in South Sudan is your responsibility unless your quotation includes registration. We are happy to guide you through the process.`,
    },
    {
      heading: "Our responsibility to you",
      body: `Nothing in these terms limits or excludes our liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot be limited or excluded by law.

Otherwise, our total liability to you in connection with an order is limited to the Agreed Price of that order. We are not responsible for indirect or consequential losses, such as loss of income, profit or business opportunity, or for losses caused by events outside our reasonable control.`,
    },
    {
      heading: "Events outside our control",
      body: `We are not responsible for failing to perform, or for delay in performing, any obligation caused by events outside our reasonable control — including natural disasters, war, civil unrest, government action, port or border closures, strikes, pandemics, and failures of shipping lines, carriers or banks. If such an event affects your order we will tell you, and the time for performing our obligations is extended for as long as the event lasts.`,
    },
    {
      heading: "Complaints and disputes",
      body: `If you are unhappy with any part of our service, please contact us first on {{phone}}, by WhatsApp on {{whatsapp}}, or by email at {{email}}, quoting your order number. We will acknowledge your complaint within 2 Business Days and aim to resolve it within 14 days.

If we cannot resolve a dispute between us by discussion within 30 days, either of us may refer it to the competent courts.

These terms are governed by the laws of the Republic of South Sudan, and the courts of Juba have jurisdiction over any dispute arising from them.`,
    },
    {
      heading: "Changes to these terms",
      body: `We may update these terms from time to time. The version shown on our website when your order is confirmed applies to that order. The date these terms were last updated is shown at the top of this page.`,
    },
    {
      heading: "Contact us",
      body: `{{company}}
Address: {{address}}
Phone: {{phone}}
WhatsApp: {{whatsapp}}
Email: {{email}}`,
    },
  ],
}

/* ─────────────────────────────────────────────────────────────────────
 * Terms of Use
 * ──────────────────────────────────────────────────────────────────── */

const TERMS_OF_USE: DefaultLegalDocument = {
  kind: LegalDocumentKind.TERMS_OF_USE,
  title: "Terms of Use",
  summary:
    "These terms govern your use of the {{business_name}} website, {{website}}. By browsing the website, requesting a quotation or tracking an order, you agree to them. Buying a vehicle or parts is covered separately by our Terms of Sale.",
  sections: [
    {
      heading: "Who we are",
      body: `This website is operated by {{company}} ("we", "us", "our"), a vehicle dealership and import business serving customers in South Sudan. Our contact details are at the end of these terms.`,
    },
    {
      heading: "Using this website",
      body: `You may use this website to browse vehicles and spare parts, request quotations, contact us and track your orders. You must be at least 18 years old, or have the permission of a parent or guardian, to request a quotation.

By using the website you agree to these Terms of Use and to our Privacy Policy. If you do not agree, please do not use the website.`,
    },
    {
      heading: "Information on the website",
      body: `We work hard to keep listings accurate and up to date, but:
- vehicle and part details, photographs and availability are provided for information and may change without notice;
- vehicles sourced from abroad may be sold to other buyers before we update the website;
- any cost described as an estimate is a guide, not a price we are bound by;
- manufacturer names and logos are used only to identify the vehicles and parts we sell.

Nothing on the website is an offer to sell. A price or vehicle is only confirmed in a written quotation, and a purchase is only agreed when we confirm your order, as described in our Terms of Sale.`,
    },
    {
      heading: "Quotation requests and enquiries",
      body: `When you request a quotation or contact us, please give accurate and complete information. By sending a request you agree that we may contact you about it by phone, WhatsApp or email, using the details you provide.

A quotation request is free and places you under no obligation. We may decline a request, for example if we cannot source what you have asked for.`,
    },
    {
      heading: "Your parts list",
      body: `The spare-parts list on this website is kept in your own browser, on your device. It does not reserve parts or fix their prices, and it is not an order. When you send the list to us as a quotation request, we check each part and confirm its availability and price in your quotation.

Clearing your browser's data, or using a different device, will empty the list.`,
    },
    {
      heading: "Track My Order",
      body: `The Track My Order page shows the progress of an order to anyone who enters its tracking number. It does not display names, contact details, prices or payments.

Please keep your tracking number private and share it only with people you trust. You must not attempt to look up tracking or order numbers that are not yours.`,
    },
    {
      heading: "Quotation links",
      body: `We may send you a private link to download your quotation. Anyone with the link can open that quotation, so please do not share it publicly. We may withdraw a link at any time, for example once a quotation has expired; ask us for a new one if you need it.`,
    },
    {
      heading: "Acceptable use",
      body: `When using this website you must not:
- break any law, or use the website for fraud or to deceive anyone;
- submit false information, or request quotations in another person's name without their permission;
- send spam, or submit forms automatically or in bulk;
- copy, scrape or harvest listings, photographs or data by automated means;
- try to gain access to any part of the website, server or database you are not authorised to use, including our administration area;
- probe, scan or test the security of the website without our written permission;
- introduce viruses or other harmful code, or do anything that overloads or disrupts the website;
- use the website or our name to impersonate us, including in requests for payment.

We may block access for anyone who breaks these rules and report unlawful activity to the authorities.`,
    },
    {
      heading: "Intellectual property",
      body: `The content of this website — including its text, design, logo, and our own photographs and videos — belongs to {{legal_name}} or is used with permission, and is protected by intellectual property law.

You may view and print pages for your own personal use, and share links to our listings. You may not reproduce, publish or use our content for commercial purposes without our written permission.

Vehicle manufacturers' names, models and logos are the trademarks of their respective owners. Their use on this website identifies the vehicles and parts we sell and does not suggest any endorsement or partnership.`,
    },
    {
      heading: "Links and third-party services",
      body: `The website links to services we do not control, such as WhatsApp, map services and social networks. When you use them, their own terms and privacy policies apply. We are not responsible for their content, availability or practices.`,
    },
    {
      heading: "Availability of the website",
      body: `We aim to keep the website available at all times but cannot guarantee that it will be uninterrupted or free from errors. We may change, suspend or withdraw any part of it — for example for maintenance or security reasons — without notice.`,
    },
    {
      heading: "Our responsibility",
      body: `The website is provided free of charge and "as available". To the extent permitted by law, we are not responsible for any loss arising from your use of the website, from reliance on information on it before it is confirmed in a quotation, or from the website being unavailable.

Nothing in these terms limits any liability that cannot be limited by law, or affects our obligations under our Terms of Sale once your order is confirmed.`,
    },
    {
      heading: "Privacy",
      body: `We handle any personal information you give us through this website as described in our Privacy Policy.`,
    },
    {
      heading: "Governing law",
      body: `These terms are governed by the laws of the Republic of South Sudan. The courts of Juba have jurisdiction over any dispute arising from them.`,
    },
    {
      heading: "Changes to these terms",
      body: `We may update these terms from time to time. The date they were last updated is shown at the top of this page. By continuing to use the website after a change, you accept the updated terms.`,
    },
    {
      heading: "Contact us",
      body: `{{company}}
Address: {{address}}
Phone: {{phone}}
WhatsApp: {{whatsapp}}
Email: {{email}}`,
    },
  ],
}

/* ─────────────────────────────────────────────────────────────────────
 * Privacy Policy
 * ──────────────────────────────────────────────────────────────────── */

const PRIVACY_POLICY: DefaultLegalDocument = {
  kind: LegalDocumentKind.PRIVACY_POLICY,
  title: "Privacy Policy",
  summary:
    "This policy explains what personal information {{business_name}} collects when you use our website or buy from us, why we collect it, who we share it with and the choices you have. We collect only what we need to serve you, and we never sell your information.",
  sections: [
    {
      heading: "Who is responsible for your information",
      body: `{{company}} ("we", "us", "our"), is responsible for the personal information described in this policy. You can contact us about your information at any time using the details at the end of this policy.`,
    },
    {
      heading: "Information you give us",
      body: `When you request a quotation, contact us or buy from us, we collect:
- **Your contact details** — your full name, phone number, WhatsApp number, email address, and country or city.
- **Your request** — the vehicle or parts you are interested in, your preferences (such as year, budget, fuel type and transmission) and any notes you write.
- **Order and payment details** — your orders, the amounts and dates of your payments, the payment method and transaction references you give us, and any receipts you send us. We never ask for or store card numbers, PINs, passwords or one-time codes.
- **Delivery and collection details** — where your order is to be collected or delivered, and the details of anyone you authorise to collect it.
- **Identity details** — when we release a vehicle, or prepare its documents, we may need to see your identification to confirm the vehicle is handed to the right person.
- **Messages** — what you tell us by phone, WhatsApp or email.

If you give us information about someone else — for example a person collecting a vehicle for you — please make sure they are happy for you to do so.`,
    },
    {
      heading: "Information collected automatically",
      body: `When you visit the website, our hosting provider automatically receives technical information such as your IP address, browser type and the pages you request. This is used to deliver the website, keep it secure and diagnose problems.

To protect our forms and sign-in pages from spam and automated attacks, we record the number of requests coming from each connection. We store only a one-way coded version of the IP address for this purpose, and delete it within a few hours.

We do not use advertising trackers or analytics cookies.`,
    },
    {
      heading: "Information stored in your own browser",
      body: `To make the website easier to use, some information is kept only in your browser, on your device, and is not sent to us unless you choose to send it:
- **Your parts list** — the parts you add, until you clear it.
- **Recently viewed** — the vehicles and parts you have looked at recently.
- **Your contact details** — after you send a quotation request, the details you entered are remembered for the rest of that browser tab's session, so you do not need to type them again. They are forgotten when you close the tab.

You can remove this information at any time by clearing your browser's data for this website.

Our website does not set cookies for visitors. Sign-in cookies are used only in our staff administration area, to keep authorised staff securely signed in.`,
    },
    {
      heading: "How we use your information",
      body: `We use your information to:
- reply to your enquiries and prepare quotations;
- confirm, process and deliver your orders;
- verify your payments and keep accurate financial records;
- send you your tracking number and updates about your order by email or WhatsApp;
- provide customer service and handle complaints;
- keep our website, our customers and our business secure, and prevent fraud;
- comply with our legal, tax and accounting obligations.

We do not send you marketing messages unless you ask us to, and we never sell or rent your personal information.`,
    },
    {
      heading: "Why we are allowed to use it",
      body: `We use your information because:
- it is needed to take steps you ask for before entering a contract, and to perform our contract with you (for example, preparing your quotation and delivering your order);
- we have a legitimate interest in running our business securely and efficiently, and in preventing fraud, in ways that do not override your rights;
- we must comply with the law (for example, keeping financial records); or
- you have given your consent, which you may withdraw at any time.`,
    },
    {
      heading: "Who we share your information with",
      body: `We share your information only where necessary, with:
- **Our service providers**, who process it on our behalf and under our instructions: our website host (Vercel), our database and file storage provider (Supabase, with servers in the European Union), and our email delivery provider (Resend).
- **WhatsApp**, when you choose to contact us or we reply to you through it. WhatsApp's own privacy policy applies to those messages.
- **Logistics partners** — exporters, shipping lines, clearing and forwarding agents and transporters — who need your name and contact details to ship, clear and deliver your order.
- **Government authorities**, such as customs and revenue authorities, where required to import your vehicle or parts, or where the law requires us to disclose information.
- **Banks and mobile-money providers**, to verify your payments and process refunds.
- **Professional advisers**, such as our accountants and lawyers, who are bound by confidentiality.

If our business is ever reorganised or sold, your information may be transferred to the new owner, who must continue to protect it as described in this policy.`,
    },
    {
      heading: "International transfers",
      body: `Our service providers store and process information on servers outside South Sudan, including in the European Union and the United States, and our logistics partners operate in the countries your order passes through, such as Japan, South Korea, China and Kenya. Where we transfer information abroad, we use reputable providers who protect it with appropriate security measures.`,
    },
    {
      heading: "How long we keep your information",
      body: `We keep personal information only for as long as we need it:
- **Quotation requests that do not become orders** — up to 24 months after our last contact with you.
- **Orders, payments and related correspondence** — for at least 7 years after the order is completed, to meet accounting and legal requirements.
- **Security records** — the coded connection records used to stop spam are deleted within a few hours.

When information is no longer needed, we delete it or make it anonymous.`,
    },
    {
      heading: "How we protect your information",
      body: `We protect your information with measures including:
- encrypted connections (HTTPS) for everything sent to and from the website;
- access to customer records limited to authorised staff, each with their own password-protected account;
- a record of the actions staff take on orders, payments and customer records;
- customer records that only our own servers can read — never directly from a web browser.

No system is completely secure. If a security incident affects your personal information in a way that puts you at risk, we will tell you promptly and explain what we are doing about it.`,
    },
    {
      heading: "Your rights",
      body: `You can ask us to:
- give you a copy of the personal information we hold about you;
- correct information that is wrong or incomplete;
- delete your information, where we no longer need it for the purposes above or the law does not require us to keep it;
- stop using your information for a particular purpose, or withdraw consent you have given.

To make a request, contact us using the details below. We may ask you to confirm your identity first, so that we never disclose your information to someone else. We will respond within 30 days.

Some information — such as records of payments — must be kept for legal reasons even if you ask us to delete it. If so, we will explain why.`,
    },
    {
      heading: "Children",
      body: `Our website and services are intended for adults. We do not knowingly collect personal information from anyone under 18 without the involvement of a parent or guardian.`,
    },
    {
      heading: "Changes to this policy",
      body: `We may update this policy to reflect changes in our services or the law. The date it was last updated is shown at the top of this page. If we make a significant change, we will make it clear on the website.`,
    },
    {
      heading: "Contact us",
      body: `For any question about your personal information, or to exercise your rights, contact:

{{company}}
Address: {{address}}
Phone: {{phone}}
WhatsApp: {{whatsapp}}
Email: {{email}}`,
    },
  ],
}

/* ─────────────────────────────────────────────────────────────────────
 * Payment Safety
 * ──────────────────────────────────────────────────────────────────── */

const PAYMENT_SAFETY: DefaultLegalDocument = {
  kind: LegalDocumentKind.PAYMENT_SAFETY,
  title: "Payment Safety",
  summary:
    "Fraudsters sometimes pretend to be vehicle dealers and importers to trick buyers into sending money to the wrong account. {{business_name}} will never ask you to pay into a personal account, and will never change our payment details by WhatsApp, text message or phone call. If anything about a payment request feels wrong, stop and call us on {{phone}} before you pay.",
  sections: [
    {
      heading: "Our official payment accounts",
      body: `We accept payment only by bank transfer and mobile money, into accounts registered in the name of {{legal_name}}.

The account details for your order are printed on your quotation and your order confirmation. Our team will also confirm them to you by phone on request — call us on {{phone}}, the number shown on this website, not a number given to you in a message.`,
    },
    {
      heading: "Account details",
      isVisible: false,
      body: `**Bank transfer**
- Bank: [bank name]
- Account name: {{legal_name}}
- Account number: [account number]
- Branch: [branch]
- SWIFT code: [SWIFT code, for international transfers]

**Mobile money**
- Service: [provider]
- Number: [number]
- Registered name: {{legal_name}}

Always use your order number as the payment reference.`,
    },
    {
      heading: "Promises we always keep",
      body: `- We will **never** ask you to pay into the personal account of a staff member or anyone else.
- We will **never** change our payment details by WhatsApp, text message, social media or phone call. If our accounts ever change, we will tell you in writing and you can confirm the change by calling the number on this website.
- We will **never** ask for your PIN, password, card number or one-time code.
- We will **never** ask you to pay with gift cards, vouchers or cryptocurrency, or to send cash through a third party.
- We will **never** pressure you to pay immediately to secure a "special discount".
- We will **always** confirm every payment we receive in writing and record it against your order.`,
    },
    {
      heading: "Before you pay",
      body: `1. Check that the account name is {{legal_name}}.
2. Check that the account details match those on your quotation or order confirmation.
3. If you have received new or different payment details, call us on {{phone}} to confirm them before paying.
4. Use your order number as the payment reference.
5. Keep your receipt or transaction reference.`,
    },
    {
      heading: "After you pay",
      body: `Send us your transaction reference or a photo of your receipt by WhatsApp on {{whatsapp}} or by email at {{email}}, quoting your order number.

We will verify that the money has arrived and confirm it to you in writing. Until then the payment is shown as "under verification". Once confirmed, it counts towards your order and appears in your payment record.`,
    },
    {
      heading: "Warning signs of a scam",
      body: `Be very careful if someone:
- asks you to pay into a different account from the one on your quotation;
- contacts you from a WhatsApp number, email address or social-media account you do not recognise, claiming to be from {{business_name}};
- sends an email from a free email address rather than our business address;
- offers a discount for paying immediately, or says a vehicle will be lost unless you pay today;
- asks you to keep the payment secret, or to pay a "release fee", "customs fee" or "shipping fee" that is not on your quotation;
- asks for your PIN, password or a one-time code.`,
    },
    {
      heading: "If you think something is wrong",
      body: `- Do not make the payment.
- Contact us straight away on {{phone}} or by WhatsApp on {{whatsapp}}, using the contact details shown on this website.
- If you have already paid, contact your bank or mobile-money provider immediately and ask them to stop or recall the payment, and report the matter to the police.
- Keep all messages, numbers and receipts — they help the authorities trace the fraud.`,
    },
    {
      heading: "Payments to other accounts",
      body: `We can only accept responsibility for money paid into our official accounts. We are not able to credit your order with money paid into any other account, but we will always help you report a fraud and give the authorities any information we can.`,
    },
  ],
}

export const DEFAULT_LEGAL_DOCUMENTS: Record<LegalDocumentKind, DefaultLegalDocument> = {
  [LegalDocumentKind.TERMS_OF_SALE]: TERMS_OF_SALE,
  [LegalDocumentKind.TERMS_OF_USE]: TERMS_OF_USE,
  [LegalDocumentKind.PRIVACY_POLICY]: PRIVACY_POLICY,
  [LegalDocumentKind.PAYMENT_SAFETY]: PAYMENT_SAFETY,
}
