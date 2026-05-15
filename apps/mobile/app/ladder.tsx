import { Text, View, StyleSheet } from 'react-native';

export default function Ladder() {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Ladder</Text>
      <Text style={s.body}>Glicko-2 rating, theo khu vực.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700' },
  body: { marginTop: 8, color: '#64748b' },
});
