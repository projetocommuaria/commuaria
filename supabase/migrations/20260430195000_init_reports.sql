-- Enable Row Level Security
CREATE TABLE reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'unresolved',
    image_url TEXT,
    anonymous BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Turn on RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to create reports (if your app logic allows it)
CREATE POLICY "Anyone can insert reports" ON reports FOR INSERT WITH CHECK (true);

-- Allow users to read all reports (or only their own, tweak as necessary)
CREATE POLICY "Anyone can read reports" ON reports FOR SELECT USING (true);

-- Allow users to read their own tasks
-- CREATE POLICY "Users can read their own reports" ON reports FOR SELECT USING (auth.uid() = user_id);

-- If users update their own stuff
CREATE POLICY "Users can update their own reports" ON reports FOR UPDATE USING (auth.uid() = user_id);
