import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function Home() {
  return (
    <ScrollView style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.title}>PCN</Text>
        <Text style={styles.subtitle}>Đặt sân pickleball — Việt Nam</Text>
      </View>
      <View style={styles.section}>
        <Link href="/search" style={styles.link}>
          Tìm sân quanh tôi →
        </Link>
        <Link href="/bookings" style={styles.link}>
          Lịch chơi của tôi →
        </Link>
        <Link href="/ladder" style={styles.link}>
          Bảng xếp hạng →
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  hero: { padding: 24, backgroundColor: '#dcfce7' },
  title: { fontSize: 32, fontWeight: '800', color: '#14532d' },
  subtitle: { fontSize: 16, color: '#15803d', marginTop: 4 },
  section: { padding: 16 },
  link: { fontSize: 18, padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
});
