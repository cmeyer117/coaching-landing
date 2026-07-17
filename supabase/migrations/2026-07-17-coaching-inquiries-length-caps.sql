alter table coaching_inquiries
  add constraint coaching_inquiries_name_len check (char_length(name) <= 100),
  add constraint coaching_inquiries_email_len check (char_length(email) <= 200),
  add constraint coaching_inquiries_message_len check (char_length(message) <= 2000);
