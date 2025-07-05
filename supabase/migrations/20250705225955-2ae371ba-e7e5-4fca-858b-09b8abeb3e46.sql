-- Clean up orphaned profile record that's preventing signup
DELETE FROM profiles WHERE email = 'morgantremaine@me.com' AND id = '172a7db0-4e3f-4369-b264-fdee32cb5b84';