# Long Short-Term Memory

## 한 줄 요약

긴 sequence에서 중요한 정보를 오래 보존하기 위해 gate 구조를 도입한 recurrent neural network 논문.

## 이 논문이 나온 배경

기존 RNN은 시간이 길어질수록 gradient가 사라지거나 폭주해서 오래전 정보를 학습하기 어려웠다. LSTM은 이 문제를 해결하기 위해 memory cell과 gate를 사용했다.

## 핵심 아이디어

- Cell state가 정보를 오래 운반한다.
- Input gate는 새 정보를 얼마나 넣을지 결정한다.
- Forget gate는 기존 정보를 얼마나 지울지 결정한다.
- Output gate는 현재 hidden state에 무엇을 내보낼지 결정한다.

## 내가 이해한 방식

LSTM은 단순히 매 순간 새 hidden state를 덮어쓰는 대신, 중요한 내용은 별도 통로에 보관하고 필요할 때 꺼내 쓰는 구조다.

## 헷갈리는 부분

- Cell state와 hidden state는 정확히 어떤 역할 차이가 있는가?
- Gate 값은 학습 과정에서 어떤 패턴을 갖게 되는가?
- Transformer의 attention과 LSTM의 memory는 어떤 점에서 다르고 어떤 점에서 비슷한가?

## 스터디 질문

- Vanishing gradient 문제는 왜 sequence 모델에서 특히 치명적인가?
- LSTM은 어떤 방식으로 긴 의존성을 보존하는가?
- 지금의 LLM에서 LSTM의 아이디어가 직접 남아 있는 부분이 있을까?
