<?php
/**
 * Global app config.
 * For WAMP defaults, MySQL user is often 'root' with empty password.
 * Update db_* values to match your local MySQL settings.
 */
return [
  // Database
  'db_host' => 'localhost',
  'db_user' => 'root',
  'db_pass' => '',
  'db_name' => 'medical_clinic',
  'db_port' => 3306,

  // JWT
  'jwt_secret' => 'change_this_super_secret_key',
  'jwt_issuer' => 'http://localhost',

  // Optional: environment flag
  'app_env' => 'local', // local | production
];
