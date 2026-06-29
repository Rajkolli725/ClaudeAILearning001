/* =============================================================================
 * Scripted REST API resource — POST trainee feedback (submit a review)
 * =============================================================================
 * Receives a review from the public web page and inserts ONE row into the
 * IMPORT-SET STAGING table. The existing transform map (configured in
 * ServiceNow) handles moving the data into the custom table on its own — this
 * script does NOT run the transform. No credentials / X-UserToken in the page.
 *
 *   Staging (import set) table : x_palni_servicen_1_inbound_trainee_feedb
 *   Custom (target) table      : x_palni_servicen_1_trainee_feedback
 *
 * DEPLOYED AS (current setup):
 *   Scripted REST API : Team Profiles  (x_palni_servicen_1 scope)
 *   Operation         : Post Trainees Feedback
 *   HTTP method       : POST
 *   Relative path     : /post_trainee_feedback
 *   Full URL          : /api/x_palni_servicen_1/team_profiles/post_trainee_feedback
 *
 * REQUIRED OPERATION SETTINGS (all must be OFF for anonymous public access):
 *        Requires authentication      : OFF
 *        Requires ACL authorization   : OFF
 *        Requires snc_internal role   : OFF   <- defaults to true; blocks guest
 *
 * CORS: covered by the existing "TeamProfile" CORS rule (https://rajkolli725.github.io,
 * GET + POST, * headers — the * headers value satisfies the JSON pre-flight).
 * ===========================================================================*/
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var STAGING = 'x_palni_servicen_1_inbound_trainee_feedb';

    function reply(status, obj) {
        response.setStatus(status);
        response.setHeader('Content-Type', 'application/json');
        response.getStreamWriter().writeString(JSON.stringify(obj));
    }

    var body = {};
    try { body = request.body.data || {}; } catch (e) { body = {}; }

    // Map the page's clean keys -> the staging table's column names.
    // (Two staging columns are auto-truncated by ServiceNow — kept verbatim.)
    var fieldMap = {
        u_trainer:                     body.trainer,
        u_trainee:                     body.trainee,
        u_batch:                       body.batch,
        u_overall_rating:              body.overall,
        u_depth_of_knowledge_covered:  body.depth,
        u_clarity_of_explanation:      body.clarity,
        u_interaction__h_participants: body.interaction,   // <- truncated column
        u_hands_on_experience:         body.handsOn,
        u_real_world_examples:         body.realWorld,
        u_session_planning_and_flow:   body.planning,
        u_mentorship_and_guidance:     body.mentorship,
        u_likelihood_t_d_this_program: body.recommend,     // <- truncated column
        sys_import_state_comment:      body.comment,
        // "Posted on" = the moment the review is submitted (authoritative server time).
        // gs.nowDateTime() is blocked in scoped apps, so use GlideDateTime.
        // For this to land in the target's u_posted_on, the STAGING table needs a
        // u_posted_on column that the transform map maps to the target field.
        // (Alternative with NO staging/transform changes: set a Default value of
        //  javascript:new GlideDateTime().getDisplayValue() on u_posted_on in the target table.)
        u_posted_on:                   new GlideDateTime().getDisplayValue()
    };

    // Insert one row into the staging table. The transform map runs on its own.
    var rowGR = new GlideRecord(STAGING);
    rowGR.newRecord();
    for (var col in fieldMap) {
        if (fieldMap[col] !== undefined && fieldMap[col] !== null && fieldMap[col] !== '') {
            rowGR.setValue(col, String(fieldMap[col]));
        }
    }
    var rowId = rowGR.insert();

    reply(201, { status: 'success', staging_row: rowId });

})(request, response);
