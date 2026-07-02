/* =============================================================================
 * Scripted REST API resource — POST website lead (Register Lead)
 * =============================================================================
 * Captures leads from every call-to-action form on the website (hero / contact
 * section / "Book a Free Demo" modal / course CTAs) and inserts one row into:
 *
 *     Table : x_palni_servicen_1_lead_registration
 *
 * Anonymous + public — NO credentials / X-UserToken are stored in the web page.
 *
 * Table columns (from the sample record):
 *     u_full_name          <- name
 *     u_email              <- email
 *     u_phone              <- phone (already includes the country code, e.g. +17148530714)
 *     u_company            <- company
 *     u_course_of_interest <- course
 *     u_preferred_mode     <- mode
 *     u_preferred_date     <- preferred_date (YYYY-MM-DD; column type Date)
 *     u_preferred_time     <- preferred_time (HH:MM; column type String)
 *     u_time_zone          <- time_zone      (IANA zone, e.g. Asia/Kolkata; String)
 *     u_message            <- message
 *   ('number' is auto-generated; sys_* are system fields.)
 *
 * DEPLOYED AS:
 *   Scripted REST API : Team Profiles  (x_palni_servicen_1 scope)
 *   Operation         : Register Lead
 *   HTTP method       : POST
 *   Relative path     : /register_lead
 *   Full URL          : /api/x_palni_servicen_1/team_profiles/register_lead
 *
 * REQUIRED OPERATION SETTINGS (all OFF for anonymous public access):
 *        Requires authentication      : OFF
 *        Requires ACL authorization   : OFF
 *        Requires snc_internal role   : OFF   <- defaults to true; blocks guest
 *
 * CORS: the lead POST is captured here, server-side, so no token lives in the page.
 *       See the CORS notes that accompany this file — because this operation is
 *       added under the EXISTING "Team Profiles" REST API, the existing
 *       "TeamProfile" CORS rule already covers it (it allows the site domain,
 *       POST, and "*" request headers). No new CORS rule is required.
 * ===========================================================================*/
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var LEADS_TABLE = 'x_palni_servicen_1_lead_registration';

    function reply(status, obj) {
        response.setStatus(status);
        response.setHeader('Content-Type', 'application/json');
        response.getStreamWriter().writeString(JSON.stringify(obj));
    }

    var body = {};
    try { body = request.body.data || {}; } catch (e) { body = {}; }

    // Map the page's clean keys -> the lead_registration table columns.
    // body.source = the call-to-action button the visitor clicked -> 'class' field.
    var fieldMap = {
        u_full_name:          body.name,
        u_email:              body.email,
        u_phone:              body.phone,
        u_company:            body.company,
        u_course_of_interest: body.course,
        u_preferred_mode:     body.mode,
        u_preferred_date:     body.preferred_date,   // YYYY-MM-DD -> Date column
        u_preferred_time:     body.preferred_time,   // HH:MM      -> String column
        u_time_zone:          body.time_zone,        // IANA zone  -> String column
        u_message:            body.message,
        'class':              body.source
    };

    // A lead needs at least a name, an email and a phone number.
    if (!fieldMap.u_full_name || !fieldMap.u_email || !fieldMap.u_phone) {
        reply(400, { status: 'error', error: 'full name, email and phone are required.' });
        return;
    }

    var gr = new GlideRecord(LEADS_TABLE);
    gr.newRecord();
    for (var col in fieldMap) {
        if (fieldMap[col] !== undefined && fieldMap[col] !== null && fieldMap[col] !== '') {
            gr.setValue(col, String(fieldMap[col]));
        }
    }
    var sysId = gr.insert();
    var number = gr.getValue('number');

    reply(201, { status: 'success', lead: sysId, number: number });

})(request, response);
