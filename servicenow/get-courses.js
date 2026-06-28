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
 *     certifications  <- u_certifications        (comma list -> chips on the page)
 *     highlights      <- u_highlights            (split by "." -> bullet points)
 *     duration        <- u_duration              (optional — see note below)
 *     inr / usd       <- u_inr / u_usd            (Individual-training price per currency)
 *     discount        <- u_discount               (discount % -> page shows was/now price)
 *     learning_steps  <- u_learning_steps         (JSON object {heading: description}
 *                        -> the animated "Your Learning Journey" section)
 *     sys_id          <- record sys_id (the page loads the image from
 *                        /course_image/{sys_id} — see get-course-image.js)
 *
 * NOTE on "duration": the sample table has no duration column. If you want it on
 * the card, add a String field `u_duration` to the table — this script returns
 * it automatically when present (empty string otherwise, and the card hides it).
 *
 * NOTE on the image: this list does NOT return the image bytes (base64-inlining
 * every image exceeds ServiceNow's 32 MB response limit). It returns sys_id and
 * the page loads each image from /course_image/{sys_id} (see get-course-image.js).
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

    // NOTE: images are NOT base64-encoded here. Inlining every course image
    // blows past ServiceNow's 32 MB response-string limit. The page instead
    // loads each image from the lightweight "Get Course Image" endpoint
    // (/course_image/{sys_id}) using the sys_id returned below.
    var out = [];
    var gr = new GlideRecord(TABLE);
    gr.addQuery('u_active', true);          // only active course records
    gr.orderBy('u_course_name');
    gr.query();
    while (gr.next()) {
        out.push({
            number:         gr.getValue('number'),
            name:           gr.getValue('u_course_name'),
            about:          gr.getValue('u_about_the_course'),         // short blurb on the card front
            description:    gr.getValue('description'),                // long description (modal + detail page)
            certifications: gr.getValue('u_certifications'),           // comma-separated -> chips
            highlights:     gr.getValue('u_highlights'),               // split by "." -> bullet points
            prerequisites:  gr.getValue('u_pre_requisites') || '',     // comma-separated -> chips
            participants:   gr.getValue('u_participants_trained') || '', // comma-separated -> chips
            rating:         gr.getValue('u_rating') || '',             // number out of 5 (e.g. 4.8)
            duration:       gr.getValue('u_duration') || '',
            inr:            gr.getValue('u_inr') || '',                // individual price in INR
            usd:            gr.getValue('u_usd') || '',                // individual price in USD
            discount:       gr.getValue('u_discount') || '',          // discount % applied to the price
            learning_steps: gr.getValue('u_learning_steps') || '', // JSON object {heading: description} -> animated journey
            sys_id:         gr.getUniqueValue()        // page builds the image URL from this
        });
    }

    response.setStatus(200);
    response.setHeader('Content-Type', 'application/json');
    response.getStreamWriter().writeString(JSON.stringify({ result: out }));

})(request, response);
