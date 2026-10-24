import { auth } from "../firebase";

const getSampleEvents = () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Must be logged in to create sample events.");
  }

  return [
    {
      title: "Sunrise hike at Blue Mountain",
      location: "Blue Mountain Trailhead",
      lat: 43.6532,
      lng: -79.3832,
      date: "2026-10-01",
      difficulty: "moderate",
      maxHeadcount: 8,
      organizerId: user.uid,
      organizerName: user.displayName || user.email,
      description:
        "Join us for a beautiful sunrise hike at Blue Mountain. Bring your camera!",
      image:
        "https://images.unsplash.com/photo-1501088430049-3eece5665327?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
      activityType: "hiking",
      tags: ["hiking", "nature", "sunrise"],
      likes: [],
      comments: [],
      status: "open",
      currentHeadcount: 0,
    },
    {
      title: "Riverside camp night",
      location: "Elk River Campground",
      lat: 43.7,
      lng: -79.42,
      date: "2026-10-08",
      difficulty: "easy",
      maxHeadcount: 6,
      organizerId: user.uid,
      organizerName: user.displayName || user.email,
    },
    {
      title: "Rocky Ridge full-day trek",
      location: "Rocky Ridge Provincial Park",
      lat: 43.8,
      lng: -79.5,
      date: "2026-10-15",
      difficulty: "hard",
      maxHeadcount: 5,
      organizerId: user.uid,
      organizerName: user.displayName || user.email,
    },
    {
      title: "Beginner nature walk",
      location: "Cedar Grove Trail",
      lat: 43.68,
      lng: -79.39,
      date: "2026-09-25",
      difficulty: "easy",
      maxHeadcount: 12,
      organizerId: user.uid,
      organizerName: user.displayName || user.email,
    },
  ];
};

export default getSampleEvents;
