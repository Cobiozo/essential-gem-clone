-- Add pre_otp_message column for text displayed above OTP form on InfoLink page
ALTER TABLE reflinks 
ADD COLUMN IF NOT EXISTS pre_otp_message text;

COMMENT ON COLUMN reflinks.pre_otp_message IS 'Tekst wyświetlany powyżej formularza OTP na stronie InfoLink';