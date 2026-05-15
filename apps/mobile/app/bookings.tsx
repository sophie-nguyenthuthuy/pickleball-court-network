import { Text, View, StyleSheet } from 'react-native';

export default function Bookings() {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Lịch chơi</Text>
      <Text style={s.body}>Đăng nhập để xem lịch chơi.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700' },
  body: { marginTop: 8, color: '#64748b' },
});
