# Attention Is All You Need

## 한 줄 요약

RNN이나 CNN 없이 attention만으로 sequence를 처리하는 Transformer 구조를 제안한 논문.

## 이 논문이 나온 배경

기존 번역 모델은 RNN 기반 encoder-decoder 구조를 많이 사용했다. 하지만 긴 문장을 순차적으로 처리해야 해서 학습과 병렬화가 느렸고, 긴 거리의 단어 관계를 잘 잡기 어려웠다.

## 핵심 아이디어

- Self-attention으로 문장 안의 모든 토큰이 서로를 직접 참고한다.
- Multi-head attention으로 여러 관점의 관계를 동시에 본다.
- Positional encoding으로 단어 순서 정보를 넣는다.
- Encoder와 decoder를 쌓아 번역 모델을 만든다.

## 내가 이해한 방식

Transformer는 문장을 왼쪽에서 오른쪽으로 한 칸씩 기억하는 방식이 아니라, 모든 단어가 서로에게 질문을 던지고 중요한 단어를 골라 보는 방식에 가깝다.

## 헷갈리는 부분

- Query, Key, Value를 직관적으로 어떻게 설명할 수 있을까?
- Positional encoding은 왜 sin, cos 형태를 썼을까?
- Multi-head attention의 각 head는 실제로 다른 정보를 배우는가?

## 스터디 질문

- Transformer가 LSTM보다 병렬화에 유리한 이유는 무엇인가?
- Self-attention의 계산량은 sequence 길이에 따라 어떻게 늘어나는가?
- 이 논문에서 지금 LLM까지 그대로 이어진 아이디어는 무엇인가?
