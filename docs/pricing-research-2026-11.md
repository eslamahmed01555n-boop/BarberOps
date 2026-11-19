# BarberOps pricing research — 2026-11-16

## Market anchors

- ORCAA publishes an Egypt-focused salon plan at 1,500 EGP/month for one location and up to 10 staff, with online booking, reminders, commissions, POS, client records and reports. It also advertises annual and multi-year terms. Source: https://orcaa.cloud/solutions/salon-software-egypt
- Fresha uses a recurring SaaS model priced per bookable team member, with separate usage pricing for some SMS/WhatsApp communications and add-ons. Source: https://www.fresha.com/pricing
- SalonAppy publishes USD 7.50 per team member/month when billed yearly, with a 14-day trial and additional optional integrations/add-ons. Source: https://www.salonappy.com/pricing

## Recommended initial BarberOps pricing

For a small Egyptian barbershop with one branch:

- Starter: 799 EGP/month, or 8,000 EGP/year. Up to 4 staff, booking board, walk-ins, queue, basic reminders and daily activity log.
- Operations: 1,499 EGP/month, or 15,000 EGP/year. Up to 10 staff, delay escalation, audit trail, reconciliation, staff permissions, reports and n8n workflows.
- Multi-branch: 2,999–4,999 EGP/month depending on branches and staff, with central dashboard and branch-level controls.

Charge a one-time onboarding fee of 2,000–5,000 EGP for service setup, staff import, training and WhatsApp/n8n configuration. Waive or discount it for early adopters.

## Commercial recommendation

Use subscription SaaS as the default, not a one-time sale. Hosting, backups, support, security updates, database operations and messaging integrations create recurring costs. Offer an annual plan with roughly two months free. Treat WhatsApp provider/API charges as pass-through or usage-based costs rather than hiding them inside the plan.

A one-time/on-premise offer can exist only for larger customers that explicitly require it: roughly 25,000–60,000 EGP for a customized deployment plus a recurring maintenance/support contract. It should not be the main offer for the first version.

## Unit economics estimate

These are planning ranges, not accounting or tax advice. At 10 or more active salons, shared infrastructure can usually be allocated at roughly 150–250 EGP per salon/month. Support, onboarding amortization, monitoring, email, AI usage and routine operations add roughly 200–450 EGP. WhatsApp/SMS provider charges should be billed separately or capped by quota, because Meta charges the WhatsApp Business Platform per delivered message and by market/category: https://business.whatsapp.com/products/platform-pricing. Railway uses a base subscription plus actual resource usage; its official pricing page lists Hobby at $5/month and Pro at $20/month, with RAM, CPU, egress and storage billed by usage: https://docs.railway.com/pricing.

On those assumptions, Starter at 799 EGP leaves approximately 299–549 EGP contribution before founder salary, tax, sales and payment fees. Operations at 1,499 EGP leaves approximately 799–1,149 EGP contribution. Multi-Branch at 3,999 EGP leaves approximately 2,399–3,099 EGP contribution. These ranges improve as the customer base grows and infrastructure is shared, but support time can reduce them sharply.

Recommended first-branch onboarding price: 3,500 EGP one time. It covers data setup, services, staff, working hours, workflows and training. A realistic direct delivery cost is 700–1,800 EGP depending on travel and data cleanup, leaving approximately 1,700–2,800 EGP before sales overhead. For the first few reference customers, use 1,999 EGP or waive the fee in exchange for a testimonial and permission to use the account as a case study.

## Positioning

BarberOps should not compete only as an appointment calendar. Its differentiator is operational control: live barber/chair state, walk-in queue, late-arrival handling, status transitions, reconciliation and an audit trail. This supports the Operations price band if those features are reliable and backed by PostgreSQL persistence.
