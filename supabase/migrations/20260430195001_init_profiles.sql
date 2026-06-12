-- Create the reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'unresolved',
    image_url TEXT,
    anonymous BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent errors
DROP POLICY IF EXISTS "Anyone can insert reports" ON reports;
DROP POLICY IF EXISTS "Anyone can read reports" ON reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON reports;
DROP POLICY IF EXISTS "Admins can delete any reports" ON reports;

-- Anyone (including guests) can insert a report
CREATE POLICY "Anyone can insert reports" ON reports FOR INSERT WITH CHECK (true);

-- Anyone can read reports (public feed)
CREATE POLICY "Anyone can read reports" ON reports FOR SELECT USING (true);

-- Users can update only their own reports
CREATE POLICY "Users can update their own reports" ON reports FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete only their own reports
CREATE POLICY "Users can delete their own reports" ON reports FOR DELETE USING (auth.uid() = user_id);

-- Admin users (checked against the profiles table) can delete any report
CREATE POLICY "Admins can delete any reports" ON reports FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);


