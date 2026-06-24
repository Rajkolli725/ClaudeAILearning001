/* =============================================================================
 * Scripted REST API resource — GET course offerings
 * =============================================================================
 * Returns every record from the course catalog as a clean JSON list that the
 * public website renders as course cards. Anonymous + read-only; no credentials.
 *
 *     Table : x_palni_servicen_1_course_offerings
 *
 * Returned keys (per course):
 *     number          <- number
 *     name            <- u_course_name
 *     about           <- u_about_the_course      (shown on the card front)
 *     certifications  <- u_certifications        (shown when expanded)
 *     highlights      <- description             (shown when expanded)
 *     duration        <- u_duration              (optional — see note below)
 *     image           <- u_course_image          (returned as a base64 data URI)
 *
 * NOTE on "duration": the sample table has no duration column. If you want it on
 * the card, add a String field `u_duration` to the table — this script returns
 * it automatically when present (empty string otherwise, and the card hides it).
 *
 * NOTE on the image: ServiceNow Image fields store a sys_id that points to a
 * db_image record; the bytes live in a sys_attachment on that db_image record.
 * imageDataUri() reads those bytes and returns a data: URI the browser can show
 * directly. If your image is stored differently, adjust imageDataUri().
 *
 * DEPLOYED AS:
 *   Scripted REST API : Team Profiles  (x_palni_servicen_1 scope)
 *   Operation         : Get Courses
 *   HTTP method       : GET
 *   Relative path     : /get_courses
 *   Full URL          : /api/x_palni_servicen_1/team_profiles/get_courses
 *
 * REQUIRED OPERATION SETTINGS (all OFF for anonymous public access):
 *        Requires authentication      : OFF
 *        Requires ACL authorization   : OFF
 *        Requires snc_internal role   : OFF
 *
 * CORS: added under the existing "Team Profiles" REST API, so the existing
 *       "TeamProfile" CORS rule already covers it (domain + GET). No change.
 * ===========================================================================*/
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var TABLE = 'x_palni_servicen_1_course_offerings';

    function imageDataUri(imgId) {
        if (!imgId) return '';
        try {
            var att = new GlideRecord('sys_attachment');
            att.addQuery('table_name', 'db_image');
            att.addQuery('table_sys_id', imgId);
            att.orderByDesc('sys_created_on');
            att.setLimit(1);
            att.query();
            if (att.next()) {
                var b64 = new GlideSysAttachment().getContentBase64(att);
                if (b64) return 'data:' + (att.getValue('content_type') || 'image/png') + ';base64,' + b64;
            }
        } catch (e) { /* fall through to empty -> card shows a placeholder */ }
        return '';
    }

    var out = [];
    var gr = new GlideRecord(TABLE);
    gr.orderBy('u_course_name');
    gr.query();
    while (gr.next()) {
        out.push({
            number:         gr.getValue('number'),
            name:           gr.getValue('u_course_name'),
            about:          gr.getValue('u_about_the_course'),
            certifications: gr.getValue('u_certifications'),
            highlights:     gr.getValue('description'),
            duration:       gr.getValue('u_duration') || '',
            image:          imageDataUri(gr.getValue('u_course_image'))
        });
    }

    response.setStatus(200);
    response.setHeader('Content-Type', 'application/json');
    response.getStreamWriter().writeString(JSON.stringify({ result: out }));

})(request, response);
