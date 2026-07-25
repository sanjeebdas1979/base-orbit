import AppContainer from "@/components/layout/AppContainer";
import Hero from "@/components/home/Hero";
import DailyCard from "@/components/home/DailyCard";
import OrbitAccess from "@/components/home/OrbitAccess";

export default function Home() {
  return (
    <AppContainer>
      <Hero />
      <DailyCard />
      <OrbitAccess />
    </AppContainer>
  );
}