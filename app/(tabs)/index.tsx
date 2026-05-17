import { ClassesScreen } from '@/screens/classes-screen';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  const handleCreateClass = () => {
    router.push('/create-class');
  };

  const handleJoinClass = () => {
    router.push('/join-class');
  };

  return <ClassesScreen onCreateClass={handleCreateClass} onJoinClass={handleJoinClass} />;
}
