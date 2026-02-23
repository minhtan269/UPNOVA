export interface TeamMember {
    id: string;
    name: string;
    role: string;
    team: "tech" | "business";
    bio: string;
    skills: string[];
    avatar?: string; // Path to image in public folder
    initials: string;
    gradient: string; // Tailwind gradient classes
    contributions?: string[]; // Optional for business team
    links?: {
        github?: string;
        linkedin?: string;
        email?: string;
    };
}

export const TEAM_MEMBERS: TeamMember[] = [
    // --------------------------------------------------------
    // TECHNICAL TEAM
    // --------------------------------------------------------
    {
        id: "dung",
        name: "Nguyen Tien Dung",
        role: "AI Engineer",
        team: "tech",
        bio: "AI student at Ho Chi Minh City University of Technology focused on computer vision, deep learning, and practical AI systems for sustainability use cases.",
        skills: ["Python", "C++", "TensorFlow", "PyTorch", "Computer Vision"],
        avatar: "/member/nguyentiendung.jpg",
        initials: "NTD",
        gradient: "from-[#0FA697] to-[#AED911]",
        contributions: [
            "Regional Finalist, Global Sustainability Challenge (2026)",
            "First Runner-up, KU CHIC Challenge (2025)",
            "Runner-up, Hackathon Vietnam (2025)",
        ],
        links: {
            github: "https://github.com/Smiling-17",
            linkedin: "https://linkedin.com/in/nguyentiendung17/",
            email: "nguyentien112006@gmail.com",
        },
    },
    {
        id: "tan",
        name: "Le Minh Tan",
        role: "Software Engineer",
        team: "tech",
        bio: "Software Engineer at Ho Chi Minh City University of Technology (HCMUT), focused on building practical applications with Kotlin and Jetpack Compose. Passionate about clean architecture, maintainable code, and continuous improvement through hands-on product development.",
        skills: [
            "Kotlin",
            "Jetpack Compose",
            "Android Development",
            "App Architecture",
            "REST API Integration",
            "Git",
        ],
        avatar: "/member/leminhtan.png",
        initials: "LMT",
        gradient: "from-[#AED911] to-[#D9CD2B]",
        contributions: [
            "Builds and improves application features with a software engineering mindset",
            "Focuses on code quality, structure, and maintainability",
            "Supports end-to-end testing and iterative bug fixing",
        ],
    },

    // --------------------------------------------------------
    // BUSINESS TEAM (Placeholders)
    // --------------------------------------------------------
    {
        id: "hoang",
        name: "Pham Huy Hoang",
        role: "Business Development Lead",
        team: "business",
        bio: "Financial Mathematics student at UEH with strengths in market research, econometric analysis, and startup-oriented business planning.",
        skills: ["Market Research", "Business Planning", "Econometrics"],
        avatar: "/member/phamhuyhoang.png",
        initials: "PHH",
        gradient: "from-blue-500 to-purple-500",
        contributions: [
            "GPA 3.8/4.0, Financial Mathematics at UEH",
            "Applied hypothesis testing and ANOVA for business optimization analysis",
            "Co-organized academic workshops and student events in a 10-member team",
        ],
        links: {
            email: "hoangpham.31241025871@st.ueh.edu.vn",
        },
    },
    {
        id: "trinh",
        name: "Nguyen Ngoc Trinh",
        role: "Marketing Manager",
        team: "business",
        bio: "Member information will be updated soon. ",
        skills: ["Marketing", "Branding", "Content"],
        avatar: "/member/nguyenngoctrinh.jpg",
        initials: "BM2",
        gradient: "from-purple-500 to-pink-500",
    },
    {
        id: "linh",
        name: "Nguyen Khanh Linh",
        role: "Business Operations",
        team: "business",
        bio: "Business Administration student with hands-on customer service and sales experience, focused on communication and practical execution.",
        skills: ["Customer Service", "Sales Operations", "Microsoft Office"],
        avatar: "/member/nguyenkhanhlinh.jpg",
        initials: "NKL",
        gradient: "from-indigo-500 to-blue-500",
        contributions: [
            "Excellent Student Award (Nov 2025)",
            "Participant Recognition, Regional Exemplary Students Exchange Program (Oct 2024)",
            "Full First-Year Scholarship, Nha Trang University",
        ],
        links: {
            linkedin: "https://linkedin.com/in/linh-nguyena-46668b31a",
            email: "klinh.ng17@gmail.com",
        },
    },
];

export const PROJECT_STATS = [
    { label: "AI Models Supported", value: "7+" },
    { label: "Global Regions", value: "12" },
    { label: "Architectural Layers", value: "4" },
    { label: "Carbon Tracking", value: "Real-time" },
];
