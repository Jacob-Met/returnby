# Choose a reminder time

For one saved return, choose **Choose reminder time**, enter a local date and time, then select **Review reminder**. The review shows the device's timezone, UTC offset, exact UTC alarm and unchanged all-day return deadline. **Download reviewed calendar** prepares the .ics file; import it into your calendar. The calendar controls delivery. This page does not schedule browser notifications, connect to a calendar provider or write reminder preferences into saved orders.

The existing **Add calendar reminder** action still prepares its original three-day alarm. For a deadline less than three days away that alarm is already past; the optional time choice lets you review a future alarm instead.

## Local clocks and deadlines

- Enter a complete future local date and minute. Invalid dates and clock times inside a daylight-saving gap are refused rather than moved silently.
- When a clock time occurs twice, the first occurrence is used. Its UTC offset and exact UTC time are shown before download. Choosing the second occurrence is not supported by this local-clock input.
- An alarm after the stored deadline is allowed only with a visible warning. It does not change or extend the return window.
- Editing the time retires the prior review. Download rechecks that the alarm is still in the future and that the local time, timezone, offset and UTC instant match the review.
- The event remains an all-day deadline with its original identity, title, text escaping and line folding. Only the VALARM trigger changes. [RFC 5545 section 3.8.6.3](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.8.6.3) requires an absolute DATE-TIME trigger to use UTC without RELATED.

## Saved-record safety

Opening the review reads the current saved list through the existing checklist's read-only admission. Unsupported, duplicate, oversized or unreadable records refuse review. The same exact saved bytes must still be present when reviewing and downloading. A storage event retires the open review; close and reopen it to read the current order. No data is repaired or overwritten. The freshness check is optimistic, not a cross-tab transaction.

Cancel or Escape leaves the saved list and unfinished intake draft unchanged. Reminder choices are temporary. As with the original action, calendar software decides whether importing an existing UID updates an event or creates another copy.

## Integration boundary

This native contribution is based on main `1e662c387be5f66f8499fac7ec443f58d2198379`. PR19 retains multi-order calendars and PR34 retains independent all-day end-date arithmetic; #8/#10 retain wider adoption. The serializer's third optional Date argument leaves existing one- and two-argument calls unchanged. When composing the batch serializer, carry the alarm-line option into its event builder without replacing that module or changing unrelated events. Its existing default alarm and civil-date correction remain separate concerns.

The explicit no-GitHub-Actions instruction remains active. Native tests and browser receipts qualify this isolated contribution; no push, PR, merge, hosted gate or deployment is represented as completed.
