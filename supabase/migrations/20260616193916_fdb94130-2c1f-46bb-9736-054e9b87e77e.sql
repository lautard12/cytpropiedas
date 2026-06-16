
DO $$
DECLARE
  _uid uuid;
  _central uuid;
  _persona uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'admin@cyt.local';

  IF _uid IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
      'admin@cyt.local', crypt('Admin2026!', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nombre":"Administrador"}'::jsonb, now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), _uid,
      jsonb_build_object('sub', _uid::text, 'email', 'admin@cyt.local', 'email_verified', true),
      'email', _uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users
       SET encrypted_password = crypt('Admin2026!', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = _uid;
  END IF;

  SELECT id INTO _central FROM public.sucursales WHERE es_central = true LIMIT 1;

  INSERT INTO public.usuarios (id, email, nombre)
  VALUES (_uid, 'admin@cyt.local', 'Administrador')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  SELECT persona_id INTO _persona FROM public.usuarios WHERE id = _uid;
  IF _persona IS NULL THEN
    INSERT INTO public.personas (nombre, email, sucursal_id)
    VALUES ('Administrador', 'admin@cyt.local', _central)
    RETURNING id INTO _persona;
    UPDATE public.usuarios SET persona_id = _persona WHERE id = _uid;
  END IF;

  INSERT INTO public.user_roles (user_id, role, sucursal_id)
  VALUES (_uid, 'admin', _central)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
