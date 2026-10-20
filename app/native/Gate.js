// 회원 승인 화면: 승인되기 전에는 앱 내용(웹 화면) 대신 이 화면만 보인다.
// 아이디 만들기 → 승인 대기(다시 확인, 기기 번호, 아이디 지우기) / 거절됨 / 인터넷 없음 / 설정 없는 빌드
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const LIGHT = { paper: '#EEF1F4', sheet: '#FFFFFF', ink: '#172231', ink2: '#4D5B6E', rule: '#D9DFE7', blue: '#1E5BD7', onBlue: '#FFFFFF', red: '#C9372A', soft: '#E6EDFB' };
const DARK = { paper: '#0E1319', sheet: '#171E27', ink: '#E9EEF4', ink2: '#A3AEBC', rule: '#2A3542', blue: '#6F9BFF', onBlue: '#0E1319', red: '#FF7766', soft: '#1A2740' };

function Btn({ c, title, onPress, kind, disabled }) {
  const main = kind !== 'sec' && kind !== 'ghost';
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [s.btn, main ? { backgroundColor: c.blue } : kind === 'sec' ? { backgroundColor: c.sheet, borderColor: c.rule, borderWidth: 1 } : null, (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={[s.btnText, { color: main ? c.onBlue : kind === 'ghost' ? c.red : c.ink }]}>{title}</Text>
    </Pressable>
  );
}

export default function Gate({ m, busy, error, dark, onRegister, onRefresh, onRemove }) {
  const c = dark ? DARK : LIGHT;
  const [id, setId] = useState('');
  const [code, setCode] = useState('');
  const [withCode, setWithCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const st = m.state;

  let body;
  if (st === 'loading') {
    body = <View style={s.center}><ActivityIndicator color={c.blue} /><Text style={[s.desc, { color: c.ink2, marginTop: 12 }]}>승인 상태를 확인하는 중</Text></View>;
  } else if (st === 'nocfg') {
    body = <Card c={c} title="설정이 빠진 빌드예요" desc="회원 확인(Firebase) 설정 없이 만든 앱이에요. 관리자에게 알려 주세요." />;
  } else if (st === 'none') {
    body = (
      <View style={[s.card, { backgroundColor: c.sheet }]}>
        <Text style={[s.title, { color: c.ink }]}>아이디 만들기</Text>
        <Text style={[s.desc, { color: c.ink2 }]}>비밀번호는 없어요. 아이디는 이 휴대폰에 고정되고, 관리자가 승인하면 바로 열려요.</Text>
        <Text style={[s.label, { color: c.ink2 }]}>아이디</Text>
        <TextInput value={id} onChangeText={setId} placeholder="2~16자, 한글·영문 소문자·숫자·_" placeholderTextColor={c.ink2}
          autoCapitalize="none" autoCorrect={false} maxLength={16} returnKeyType={withCode ? 'next' : 'done'}
          style={[s.input, { color: c.ink, borderColor: c.rule, backgroundColor: c.paper }]} />
        {withCode ? (
          <>
            <Text style={[s.label, { color: c.ink2 }]}>초대 코드</Text>
            <TextInput value={code} onChangeText={setCode} placeholder="받은 6자리 코드" placeholderTextColor={c.ink2}
              autoCapitalize="characters" autoCorrect={false} maxLength={12}
              style={[s.input, { color: c.ink, borderColor: c.rule, backgroundColor: c.paper }]} />
          </>
        ) : (
          <Pressable onPress={() => setWithCode(true)}><Text style={[s.link, { color: c.blue }]}>초대 코드가 있어요</Text></Pressable>
        )}
        {error ? <Text style={[s.err, { color: c.red }]}>{error}</Text> : null}
        <Btn c={c} title={busy ? '보내는 중…' : withCode && code.trim() ? '아이디 만들기' : '승인 요청 보내기'} disabled={busy || !id.trim()} onPress={() => onRegister(id, withCode ? code : '')} />
      </View>
    );
  } else if (st === 'pending' || st === 'rejected') {
    const pending = st === 'pending';
    body = (
      <View style={[s.card, { backgroundColor: c.sheet }]}>
        <Text style={[s.title, { color: c.ink }]}>{pending ? '승인을 기다리고 있어요' : '승인되지 않았어요'}</Text>
        <Text style={[s.desc, { color: c.ink2 }]}>{pending ? '관리자가 승인하면 바로 열려요. 앱을 켜 두면 잠시마다 다시 확인해요.' : '관리자에게 문의해 주세요. 아이디를 지우고 다시 요청할 수도 있어요.'}</Text>
        <View style={[s.kv, { backgroundColor: c.soft }]}>
          <Text style={[s.k, { color: c.ink2 }]}>아이디</Text><Text style={[s.v, { color: c.ink }]}>{m.id}</Text>
        </View>
        <Pressable onPress={async () => { await Clipboard.setStringAsync(m.uid || ''); setCopied(true); }} style={[s.kv, { backgroundColor: c.soft }]}>
          <Text style={[s.k, { color: c.ink2 }]}>기기 번호{copied ? ' (복사했어요)' : ' (눌러서 복사)'}</Text><Text selectable style={[s.uid, { color: c.ink }]}>{m.uid}</Text>
        </Pressable>
        {m.offline ? <Text style={[s.err, { color: c.red }]}>인터넷에 연결되어 있지 않아요.</Text> : null}
        {error ? <Text style={[s.err, { color: c.red }]}>{error}</Text> : null}
        <Btn c={c} title={busy ? '확인하는 중…' : '다시 확인'} disabled={busy} onPress={onRefresh} />
        <Btn c={c} kind="ghost" title="아이디 지우기" disabled={busy} onPress={onRemove} />
      </View>
    );
  } else {
    body = (
      <View style={[s.card, { backgroundColor: c.sheet }]}>
        <Text style={[s.title, { color: c.ink }]}>{st === 'offline' ? '인터넷에 연결해 주세요' : '확인하지 못했어요'}</Text>
        <Text style={[s.desc, { color: c.ink2 }]}>{st === 'offline' ? '처음 한 번은 인터넷으로 승인 상태를 확인해야 해요.' : (m.msg || '잠시 뒤 다시 확인해 주세요.')}</Text>
        <Btn c={c} title={busy ? '확인하는 중…' : '다시 확인'} disabled={busy} onPress={onRefresh} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={[s.fill, { backgroundColor: c.paper }]}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[s.brand, { color: c.ink }]}>기술사 6개월</Text>
        <Text style={[s.sub, { color: c.ink2 }]}>토목시공기술사 필기 독학</Text>
        {body}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Card({ c, title, desc }) {
  return (
    <View style={[s.card, { backgroundColor: c.sheet }]}>
      <Text style={[s.title, { color: c.ink }]}>{title}</Text>
      <Text style={[s.desc, { color: c.ink2 }]}>{desc}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: 80, paddingBottom: 40 },
  center: { alignItems: 'center', paddingVertical: 40 },
  brand: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 15, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  card: { borderRadius: 18, padding: 20 },
  title: { fontSize: 21, fontWeight: '800', marginBottom: 6 },
  desc: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17 },
  link: { fontSize: 15, fontWeight: '600', marginTop: 14 },
  err: { fontSize: 14, marginTop: 12 },
  btn: { borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  btnText: { fontSize: 17, fontWeight: '700' },
  kv: { borderRadius: 12, padding: 12, marginTop: 12 },
  k: { fontSize: 13, fontWeight: '600' },
  v: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  uid: { fontSize: 14, marginTop: 2, fontFamily: 'Menlo' },
});
