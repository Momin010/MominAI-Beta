-- Supabase Database Schema for MominAI Sandbox
-- This file contains the SQL to create the sandbox_history table.
-- Instructions: To run this in the Supabase dashboard:
-- 1. Log in to your Supabase project dashboard.
-- 2. Navigate to the SQL Editor section.
-- 3. Copy and paste the contents of this file into the editor.
-- 4. Click "Run" to execute the SQL and create the table.
-- Note: Ensure the uuid-ossp extension is enabled in your project.

-- Enable the uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- Create the rooms table for shared chat rooms
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_public BOOLEAN DEFAULT TRUE
);

-- Create the room_members table for room access control
CREATE TABLE room_members (
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    PRIMARY KEY (room_id, user_id)
);

-- Create the room_messages table for shared messages
CREATE TABLE room_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT,
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Users can view public rooms" ON rooms FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view rooms they are members of" ON rooms FOR SELECT USING (
    EXISTS (SELECT 1 FROM room_members WHERE room_id = rooms.id AND user_id = auth.uid())
);
CREATE POLICY "Authenticated users can create rooms" ON rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Room owners can update their rooms" ON rooms FOR UPDATE USING (
    created_by = auth.uid()
);

-- RLS Policies for room_members
CREATE POLICY "Users can view members of rooms they are in" ON room_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid())
);
CREATE POLICY "Room owners can manage members" ON room_members FOR ALL USING (
    EXISTS (SELECT 1 FROM rooms WHERE id = room_members.room_id AND created_by = auth.uid())
);
CREATE POLICY "Users can join public rooms" ON room_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM rooms WHERE id = room_members.room_id AND is_public = true) AND
    auth.uid() IS NOT NULL
);

-- RLS Policies for room_messages
CREATE POLICY "Users can view messages in rooms they are members of" ON room_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM room_members WHERE room_id = room_messages.room_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert messages in rooms they are members of" ON room_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM room_members WHERE room_id = room_messages.room_id AND user_id = auth.uid()) AND
    auth.uid() IS NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_room_messages_room_id_created_at ON room_messages(room_id, created_at);
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_rooms_created_by ON rooms(created_by);

-- New tables for container/session tracking

-- Create the backend_execution_sessions table
CREATE TABLE backend_execution_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    room_id UUID REFERENCES rooms(id),
    session_name TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the container_instances table
CREATE TABLE container_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES backend_execution_sessions(id) ON DELETE CASCADE NOT NULL,
    container_id TEXT NOT NULL,
    image TEXT,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'stopped', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the execution_logs table
CREATE TABLE execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id UUID REFERENCES container_instances(id) ON DELETE CASCADE NOT NULL,
    log_level TEXT DEFAULT 'info' CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE backend_execution_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for backend_execution_sessions
CREATE POLICY "Users can view their own execution sessions" ON backend_execution_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own execution sessions" ON backend_execution_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own execution sessions" ON backend_execution_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own execution sessions" ON backend_execution_sessions FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for container_instances
CREATE POLICY "Users can view containers in their sessions" ON container_instances FOR SELECT USING (
    EXISTS (SELECT 1 FROM backend_execution_sessions WHERE id = container_instances.session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create containers in their sessions" ON container_instances FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM backend_execution_sessions WHERE id = container_instances.session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update containers in their sessions" ON container_instances FOR UPDATE USING (
    EXISTS (SELECT 1 FROM backend_execution_sessions WHERE id = container_instances.session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete containers in their sessions" ON container_instances FOR DELETE USING (
    EXISTS (SELECT 1 FROM backend_execution_sessions WHERE id = container_instances.session_id AND user_id = auth.uid())
);

-- RLS Policies for execution_logs
CREATE POLICY "Users can view logs for their containers" ON execution_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM container_instances ci JOIN backend_execution_sessions bes ON ci.session_id = bes.id WHERE ci.id = execution_logs.container_id AND bes.user_id = auth.uid())
);
CREATE POLICY "Users can insert logs for their containers" ON execution_logs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM container_instances ci JOIN backend_execution_sessions bes ON ci.session_id = bes.id WHERE ci.id = execution_logs.container_id AND bes.user_id = auth.uid())
);

-- Indexes for new tables
CREATE INDEX idx_backend_execution_sessions_user_id ON backend_execution_sessions(user_id);
CREATE INDEX idx_backend_execution_sessions_room_id ON backend_execution_sessions(room_id);
CREATE INDEX idx_backend_execution_sessions_created_at ON backend_execution_sessions(created_at);
CREATE INDEX idx_container_instances_session_id ON container_instances(session_id);
CREATE INDEX idx_container_instances_created_at ON container_instances(created_at);
CREATE INDEX idx_execution_logs_container_id ON execution_logs(container_id);
CREATE INDEX idx_execution_logs_timestamp ON execution_logs(timestamp);