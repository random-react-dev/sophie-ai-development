export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Scenario {
    id: string;
    title: string;
    category: string;
    description: string;
    sophieRole: string;
    userRole: string;
    topic: string;
    level: CEFRLevel;
    context: string;
    icon: string;
}

export const SCENARIOS: Scenario[] = [
    {
        id: 'ordering-coffee',
        title: 'Ordering Coffee',
        category: 'Food & Drink',
        description: 'Order a latte and a croissant at a busy café.',
        sophieRole: 'Barista at a busy city center café',
        userRole: 'A customer looking for breakfast',
        topic: 'Daily Life',
        level: 'A1',
        context: 'You are at a café called "The Morning Grind". You want to order a coffee and something to eat.',
        icon: 'coffee'
    },
    {
        id: 'job-interview',
        title: 'Job Interview',
        category: 'Business',
        description: 'Interview for a software engineer position.',
        sophieRole: 'Senior Technical Recruiter at a tech company',
        userRole: 'Candidate applying for a Frontend Developer role',
        topic: 'Career',
        level: 'B2',
        context: 'You are in an interview for your dream job. Sophie will ask about your experience and skills.',
        icon: 'briefcase'
    },
    {
        id: 'asking-directions',
        title: 'Asking Directions',
        category: 'Travel',
        description: 'You are lost in Tokyo and need to find a train station.',
        sophieRole: 'A helpful local resident in Tokyo',
        userRole: 'A tourist who is slightly lost',
        topic: 'Travel',
        level: 'A2',
        context: 'You are near Shibuya Crossing and need to get to the JR station but your phone battery is dead.',
        icon: 'compass'
    },
    {
        id: 'hotel-check-in',
        title: 'Hotel Check-in',
        category: 'Travel',
        description: 'Check in and ask for a room and a view.',
        sophieRole: 'Front desk receptionist at a 4-star hotel',
        userRole: 'A guest arriving for a three-night stay',
        topic: 'Travel',
        level: 'A2',
        context: 'You have a reservation under your name. You want to confirm the breakfast times and ask if there is a room with a nice view available.',
        icon: 'bed'
    },
    {
        id: 'political-debate',
        title: 'Political Debate',
        category: 'Social',
        description: 'Discuss environmental policies and climate change.',
        sophieRole: 'A passionate environmental advocate',
        userRole: 'A skeptical citizen or opposing policy maker',
        topic: 'Current Affairs',
        level: 'C1',
        context: 'Engage in a deep discussion about the balance between economic growth and environmental protection.',
        icon: 'mic'
    }
];

export const CATEGORIES = ['All', 'Food & Drink', 'Business', 'Social', 'Travel', 'Customer Service', 'Education'];

export const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
