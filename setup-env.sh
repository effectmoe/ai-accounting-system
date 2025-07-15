#!/bin/bash

# 環境変数を設定
echo "Setting environment variables..."

# Supabase
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force

echo "https://clqpfmroqcnvyxdzadln.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --force

echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ" | vercel env add SUPABASE_SERVICE_ROLE_KEY production --force

# Google Cloud
echo "claudemcp-451912" | vercel env add GOOGLE_CLOUD_PROJECT_ID production --force
echo "ad5c94da11154142761056185550322e89f932ee" | vercel env add GOOGLE_PRIVATE_KEY_ID production --force
echo "accounting-ocr@claudemcp-451912.iam.gserviceaccount.com" | vercel env add GOOGLE_CLIENT_EMAIL production --force
echo "102125073059217534960" | vercel env add GOOGLE_CLIENT_ID production --force

# GAS
echo "https://script.google.com/macros/s/AKfycbxH9yrsFdWlfd78HlnZQ0a7lRUHzWfNFCD4RSj1rQ1pJ9TrzLdWNbYxLbZ2PGcFy8Rk/exec" | vercel env add GAS_WEBHOOK_URL production --force

# OCR
echo "true" | vercel env add ENABLE_OCR production --force
echo "1cNaF0b6vJJJ4SstVbUg-KdyJHiykGQYdqMCRRs7a0VY" | vercel env add GOOGLE_DRIVE_OCR_FOLDER_ID production --force

# Google Private Key (multi-line)
cat << 'EOF' | vercel env add GOOGLE_PRIVATE_KEY production --force
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCihYCAXAgLR5HQ
HrFYaKMz0E01KU85a9DkmNB/a2/m/fjO7rM0tywWmE/JIR9D7JDoi4a1L5WGA5sQ
ilWCsVnF/kSUujryFL1IA3DNg+Xu4PbCoRen+vaRebtf+MWuiiImYsGPirXwseR/
4uZ/jUEyRJD4b25NlaBNQbImO53bkcUU1D7UFRaEA8067RtWnhC8DN5nLHjg0RHM
jHCUKdrRiIrN1BgZUEj2Y7QMkAnaWg9EBzDExYogriA1xxqSTgPessUPRTViO2cP
3xWDc5ido5limsnx3Yl3PEsDeguLMX73gwZaVGZEBWH26URludP3mppnI2leFcSx
MttUMKaNAgMBAAECgf9qfpB1i9i5i2xAs9wB0o8epJ/y9d60AbIgGQKGfCAXfNRM
xJ0pLd318FhXsxyJpbpOpx7eGxAfgL1bWUovGYd59eN6kY2Ok4h0Z8zC3msM3NzV
LDoUGJ75NItTl+/xLxKxlITBSmNuFSNlqYjgi+7swYE9Scc9j447EZFq/CW0egR+
OHHk70RWR0DV6KRX799pcokPEyBBEJkLktsJV4pjEgXn5j3MI1lP5dymlbBL8D5r
uTMqjAJEmIIgm6ImiDgFHsvtFVPIpFVVMGMwHbqmu/8aobctMBa3V8XIuUoXYHtK
bKcnv/gRXR1peAhEheMbOPufeLhKI9/zLIV3mwECgYEA2imp0GSo1WQwJjbu404q
qR92GIX7aKsBYt4/LUGSzDxIUD3plvVY47rzMEze1nAmaVyNJQaVfmDcbBibxUHN
s/UrcBBKjm2RSULBX2jEUkMtUeZBLi0sDVWe1kjoz1+KRlBsX7dWsg7mdru2sNKE
bCvgZFkaYbGyn9x8ILsbdwECgYEAvrVjwQzLAcJJBdcboVRAttEhugr9qFD9T2IF
sETvc7fMw/IVxeUzEiMG8xQW7ijEkF9S8ll4pip8M/bXADj51b8LPIIGF7T/ZfJ4
jv7UBv6SSUIpz/Kfh7ku1Q9FM0vUIR/K0Ht2ExpJwHY0kbAeqNafwATywpnoCyG0
3XuDG40CgYEAh1WXKVZ4QcAf+mTTdqCT6ExDB11+I2UJvBpgmKN3/EhdF6IAmQvk
M4lSuSDGj8IMogmu6UwXSsmtk0UExK5YfA1X//GrPoWLviWyLYyhVOKlZ4vt3UZa
cH8vxICAI7yB27KiOBJUrqp9nyQ9ZZ2CVlQ1pCp+KiKAy5iMTAWmOQECgYEAjw1x
bnYyMXeTXxYkW7ffc0MckXl9HKzj1pAoxDhxhdPxfWoyeueaj5hGtj/zk2JxT/qx
Nal3nu1vjWszi68xeOx9eT3vZAkZK1fepyTv1u9OvDUtOBc/I4f9YUS7G+ddkBtQ
/2IdB+dIO15vwHjkBrI30snjb6YTMYZvLVRg3GECgYEAuinmnLiZWS/QJHOd46lV
yPOp8oASx5tp28WBHEKlY8+dvd0vgSupvcYuqEW9Hgzgcx3JzZ//SX9L5V06DkoG
YvJDakwLxBDQsXkR+z0QZpKISR356TvC3Sb+ELLKXgVAirTbNpdACLaaDYrdC4m2
6CMjjzTHzTJFHu/9v/+QcrU=
-----END PRIVATE KEY-----
EOF

echo "Environment variables set successfully!"