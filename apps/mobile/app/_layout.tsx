import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const client = new QueryClient();

export default function Root() {
  return (
    <QueryClientProvider client={client}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerTitleStyle: { fontWeight: '600' } }} />
    </QueryClientProvider>
  );
}
