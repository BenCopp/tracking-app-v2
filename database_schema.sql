-- SCHEMA POSTGRESQL (Supabase)

-- MUSCULATION
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE workout_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id UUID REFERENCES exercises(id),
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    reps INTEGER NOT NULL,
    weight DECIMAL NOT NULL,
    rest_time INTEGER, -- In seconds
    rpe INTEGER, -- Rate of Perceived Exertion (1-10)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NUTRITION
CREATE TABLE foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    protein DECIMAL DEFAULT 0,
    carbs DECIMAL DEFAULT 0,
    fat DECIMAL DEFAULT 0,
    calories DECIMAL GENERATED ALWAYS AS (protein * 4 + carbs * 4 + fat * 9) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE daily_intakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE TABLE intake_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intake_id UUID REFERENCES daily_intakes(id) ON DELETE CASCADE,
    food_id UUID REFERENCES foods(id),
    quantity DECIMAL NOT NULL, -- In grams
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HABITS
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'count' or 'boolean'
    target_value INTEGER NOT NULL,
    frequency_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    value INTEGER NOT NULL,
    timestamp_completed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI AGENT CACHE / MEMORY (Optional for RAG)
CREATE TABLE ai_reflections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    reflection_type TEXT, -- 'weekly_summary', 'progress_analysis'
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES for Analytics
CREATE INDEX idx_workout_sets_session ON workout_sets(session_id);
CREATE INDEX idx_intake_items_intake ON intake_items(intake_id);
CREATE INDEX idx_habit_logs_habit ON habit_logs(habit_id);
