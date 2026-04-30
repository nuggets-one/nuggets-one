CREATE OR REPLACE FUNCTION get_notification_recipients(
  p_stream_col text
)
RETURNS TABLE (user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_stream_col NOT IN ('stream_standard', 'stream_pulse') THEN
    RAISE EXCEPTION 'Invalid stream column: %', p_stream_col;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT u.id AS user_id
     FROM auth.users u
     LEFT JOIN public.notification_preferences np
       ON np.user_id = u.id
     WHERE COALESCE(np.mute_all, false) = false
       AND COALESCE(np.%I, true) = true',
    p_stream_col
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_notification_recipients(text)
  TO service_role;
