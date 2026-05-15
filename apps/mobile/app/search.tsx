import { Text, View, StyleSheet } from 'react-native';

export default function Search() {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Tìm sân</Text>
      <Text style={s.body}>Bản đồ + danh sách sân theo vị trí — kết nối /v1/venues khi mở app.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700' },
  body: { marginTop: 8, color: '#64748b' },
});
