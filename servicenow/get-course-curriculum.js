/* =============================================================================
 * Scripted REST API resource — GET a course's curriculum file (binary download)
 * =============================================================================
 * Streams the file attached to a course record's "u_course_curriculum" field so
 * the public page can download it after the user submits the lead form:
 *     <iframe src="/api/.../course_curriculum/{sys_id}">  (forces a download)
 *
 * File lookup (tolerant — covers the common ways SN stores a file field):
 *   1. If u_course_curriculum holds a sys_id, use the attachment with that
 *      sys_id (field stores the attachment directly), else the first
 *      attachment on the record that sys_id points to.
 *   2. Fallback: the first NON-image attachment on the course record
 *      (the course image lives there too, so images are skipped).
 *
 * The response sets Content-Disposition: attachment so the browser downloads
 * the file instead of navigating to it.
 *
 * DEPLOYED AS:
 *   Scripted REST API : Team Profiles  (x_palni_servicen_1 scope)
 *   Operation         : Get Course Curriculum
 *   HTTP method       : GET
 *   Relative path     : /course_curriculum/{id}
 *   Full URL          : /api/x_palni_servicen_1/team_profiles/course_curriculum/{sys_id}
 *
 * REQUIRED OPERATION SETTINGS (all OFF for anonymous public access):
 *        Requires authentication      : OFF
 *        Requires ACL authorization   : OFF
 *        Requires snc_internal role   : OFF
 *
 * CORS: the page downloads via a hidden <iframe> (a top-level navigation to the
 *       file), so no CORS rule change is needed — same as the image endpoints.
 * ===========================================================================*/
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var COURSES = 'x_palni_servicen_1_course_offerings';
    var recId = request.pathParams.id || '';

    if (!/^[a-f0-9]{32}$/i.test(recId)) {
        return fail(400, 'bad sys_id');
    }

    var course = new GlideRecord(COURSES);
    if (!course.get(recId)) {
        return fail(404, 'course not found');
    }

    var att = null;

    // 1) Resolve from the u_course_curriculum field if it carries a sys_id.
    var fieldVal = course.isValidField('u_course_curriculum') ? ('' + course.getValue('u_course_curriculum')) : '';
    if (/^[a-f0-9]{32}$/i.test(fieldVal)) {
        att = attachmentById(fieldVal);                 // field stores the attachment sys_id
        if (!att) att = firstAttachment(fieldVal, false); // or a record the file is attached to
    }

    // 2) Fallback: first non-image attachment on the course record.
    if (!att) att = firstAttachment(recId, true);

    if (!att) {
        return fail(404, 'no curriculum file');
    }

    var ct = att.getValue('content_type') || 'application/octet-stream';
    var fn = (att.getValue('file_name') || 'course-curriculum').replace(/"/g, '');
    response.setStatus(200);
    response.setHeader('Content-Type', ct);
    response.setHeader('Content-Disposition', 'attachment; filename="' + fn + '"');
    response.setHeader('Cache-Control', 'public, max-age=3600');
    response.getStreamWriter().writeStream(new GlideSysAttachment().getContentStream(att.getUniqueValue()));

    // ---- helpers ----
    function attachmentById(sysId) {
        var a = new GlideRecord('sys_attachment');
        return a.get(sysId) ? a : null;
    }
    function firstAttachment(tableSysId, nonImageOnly) {
        var a = new GlideRecord('sys_attachment');
        a.addQuery('table_sys_id', tableSysId);
        a.orderByDesc('sys_created_on');
        a.query();
        while (a.next()) {
            if (nonImageOnly && ('' + a.getValue('content_type')).toLowerCase().indexOf('image') === 0) continue;
            return a;
        }
        return null;
    }
    function fail(code, msg) {
        response.setStatus(code);
        response.setHeader('Content-Type', 'application/json');
        response.getStreamWriter().writeString(JSON.stringify({ error: msg }));
    }

})(request, response);
