**논문 정보**

- **Title:** Neural Machine Translation by Jointly Learning to Align and Translate
- **Authors:** Dzmitry Bahdanau, Kyunghyun Cho, Yoshua Bengio
- **Published:** ICLR 2015 (arXiv 최초 공개: 2014)
- **Keywords:** Attention Mechanism, Encoder-Decoder, RNN, BiRNN, Neural Machine Translation
- **Paper:** https://arxiv.org/abs/1409.0473

---

# 1. 선정 이유

이전에 AlexNet과 Transformer 논문을 공부하면서 딥러닝의 다양한 아키텍처를 접했다.

AlexNet에서는 CNN이 이미지에서 특징을 추출하는 방법을 배웠고, Transformer에서는 Attention을 활용하여 입력 데이터 사이의 관계를 학습한다는 사실을 알게 되었다.

하지만 Transformer를 공부하면서 한 가지 의문이 생겼다.

**"Attention은 정확히 무엇이며, 왜 등장하게 되었을까?"**

Transformer에서는 Self-Attention을 핵심 메커니즘으로 사용하지만, Attention이라는 개념이 처음부터 Transformer와 함께 등장한 것은 아니다.

이번에 선정한 Bahdanau et al. (2015)의 논문은 기존 Encoder-Decoder 구조의 한계를 개선하기 위해 Attention을 도입한 대표적인 연구다.

이 논문을 통해 다음 세 가지를 이해하고자 한다.

1. 기존 RNN 기반 Encoder-Decoder 구조에는 어떤 문제가 있었는가?
2. Attention은 어떤 원리로 입력 데이터의 중요한 부분을 선택하는가?
3. Attention을 도입했을 때 기존 모델과 비교하여 어떤 성능 개선이 나타나는가?

궁극적으로는 Attention을 단순한 딥러닝 기법으로 암기하는 것이 아니라, **어떤 문제를 해결하기 위해 제안되었고 어떤 수학적 원리로 작동하는지** 이해하는 것이 목표다.

# 2. 내가 이해한 핵심

## 2.1 기존 Encoder-Decoder 구조

Attention을 이해하기 위해서는 먼저 기존 Encoder-Decoder 구조를 이해해야 한다.

Encoder-Decoder는 입력 시퀀스를 받아 다른 출력 시퀀스를 생성하는 신경망 구조다.

대표적인 예시는 기계번역이다.

예를 들어 다음과 같은 문장을 번역한다고 가정하자.

- Input: "I love machine learning"
- Output: "나는 머신러닝을 좋아한다"

기존 RNN 기반 Encoder-Decoder는 크게 두 부분으로 구성된다.

### Encoder

입력 문장을 순차적으로 읽고 문장의 정보를 내부 상태에 저장한다.

RNN은 이전 시점의 Hidden State와 현재 입력을 이용하여 새로운 Hidden State를 계산한다.

**RNN의 Hidden State 계산**

`h_t = f(h_(t-1), x_t)`

- `x_t`: 현재 시점의 입력
- `h_(t-1)`: 이전 시점의 Hidden State
- `h_t`: 현재 시점의 Hidden State

기존 구조에서는 마지막 Hidden State 등을 이용해 입력 문장을 하나의 고정 길이 벡터로 표현한다.

### Decoder

Encoder가 생성한 벡터를 이용하여 번역 문장을 한 단어씩 생성한다.

즉, 기존 구조는 다음과 같이 정리할 수 있다.

`Input Sentence → Encoder → Fixed-length Vector → Decoder → Output Sentence`

### 기존 구조의 한계: Information Bottleneck

여기서 중요한 문제가 발생한다.

입력 문장이 길어지더라도 Encoder는 문장의 정보를 고정된 크기의 벡터에 압축해야 한다.

예를 들어 5개의 단어로 구성된 문장과 50개의 단어로 구성된 문장을 동일한 크기의 벡터로 표현해야 한다면, 긴 문장에서는 필요한 정보를 충분히 보존하기 어려울 수 있다.

이러한 현상을 **Information Bottleneck(정보 병목)** 문제라고 이해했다.

논문에서는 이 고정 길이 벡터가 번역 성능을 제한할 수 있다고 보고, Decoder가 입력 문장의 여러 위치에 직접 접근할 수 있도록 구조를 변경했다.

## 2.2 Attention Mechanism

Attention의 핵심 아이디어는 비교적 간단하다.

**"출력 단어를 생성할 때마다 입력 문장 전체를 동일하게 참고하는 것이 아니라, 현재 출력에 관련성이 높은 입력 부분에 더 큰 가중치를 부여하자."**

예를 들어 다음 문장을 번역한다고 가정하자.

- Input: "I love apples"
- Output: "나는 사과를 좋아한다"

Decoder가 "사과를"이라는 단어를 생성할 때는 입력 문장의 "apples"에 높은 Attention을 부여하는 것이 자연스럽다.

반면 "나는"을 생성할 때는 "I"에 높은 가중치를 부여할 수 있다.

이처럼 출력 시점마다 입력의 각 위치에 서로 다른 가중치를 부여하는 것이 Attention의 기본 원리다.

단, Attention이 반드시 하나의 단어만 선택하는 것은 아니다. 여러 입력 위치에 가중치를 분산하여 정보를 함께 활용한다.

### 핵심 용어 ① Alignment

Alignment는 입력 문장과 출력 문장 사이의 대응 관계를 의미한다.

예를 들어 영어 단어 "apples"와 한국어 표현 "사과를"은 번역 과정에서 서로 관련된 부분이다.

기존 번역 시스템에서도 이러한 대응 관계는 중요한 문제였다.

이 논문에서는 신경망이 번역과 함께 입력과 출력 사이의 Soft Alignment를 학습하도록 했다.

여기서 Soft Alignment란 특정 위치 하나를 반드시 선택하는 것이 아니라, 여러 입력 위치에 연속적인 가중치를 부여하는 방식을 의미한다.

### 핵심 용어 ② Attention Score

Attention Score는 현재 출력 단어를 생성할 때 입력의 특정 위치가 얼마나 관련 있는지를 나타내는 점수다.

논문에서는 다음과 같이 정의한다.

**Attention Score 계산**

`e_ij = a(s_(i-1), h_j)`

- `e_ij`: 출력 시점 i와 입력 위치 j 사이의 관련성 점수
- `s_(i-1)`: Decoder의 이전 Hidden State
- `h_j`: Encoder의 j번째 Annotation Vector
- `a`: 관련성을 계산하는 학습 가능한 함수

즉, Decoder의 현재 번역 상태와 Encoder가 생성한 각 입력 표현을 비교하여 관련성 점수를 계산한다.

이 논문에서는 관련성 함수로 작은 Feedforward Neural Network를 사용한다.

### 핵심 용어 ③ Attention Weight와 Softmax

Attention Score는 아직 정규화되지 않은 값이다.

이를 각 입력 위치에 대한 가중치로 변환하기 위해 Softmax를 사용한다.

**Softmax 계산**

`alpha_ij = exp(e_ij) / sum(exp(e_ik))`

여기서 `sum`은 입력의 모든 위치 k에 대해 계산한 값의 합을 의미한다.

- `alpha_ij`: 정규화된 Attention Weight
- `e_ij`: 출력 시점 i와 입력 위치 j 사이의 Attention Score
- `exp`: 자연상수 e를 밑으로 하는 지수함수

Softmax를 거치면 각 가중치는 0과 1 사이의 값을 가지며, 한 출력 시점에서 모든 입력 위치에 대한 가중치의 합은 1이 된다.

따라서 관련성이 높은 입력 위치는 상대적으로 큰 가중치를 받는다.

중요한 점은 이 가중치가 사람이 직접 지정하는 값이 아니라 **모델이 번역 학습 과정에서 자동으로 학습하는 값**이라는 것이다.

### 핵심 용어 ④ Context Vector

Attention Weight를 계산한 다음에는 각 입력의 Annotation Vector에 가중치를 곱하여 더한다.

**Context Vector 계산**

`c_i = sum(alpha_ij * h_j)`

- `c_i`: 출력 시점 i의 Context Vector
- `alpha_ij`: 입력 위치 j에 대한 Attention Weight
- `h_j`: 입력 위치 j의 Annotation Vector

즉, 각 입력 표현에 중요도를 곱한 다음 모두 더하여 하나의 Context Vector를 생성하는 것이다.

Context Vector는 현재 출력 단어를 생성하는 데 필요한 입력 문장의 정보를 요약한 벡터다.

기존 Encoder-Decoder와의 가장 큰 차이점은 다음과 같다.

- 기존 구조: 입력 문장 전체를 하나의 고정된 벡터로 압축하여 사용
- Attention 구조: 출력 시점마다 서로 다른 Context Vector를 계산하여 사용

즉, Attention을 사용하면 Decoder가 출력 단어를 생성할 때마다 입력 문장의 다른 부분을 참고할 수 있다.

## 2.3 논문의 전체 아키텍처

이 논문에서 제안한 구조는 크게 세 단계로 나눌 수 있다.

### ① Bidirectional RNN Encoder

기존 RNN은 일반적으로 입력 문장을 한 방향으로 읽는다.

반면 Bidirectional RNN은 문장을 정방향과 역방향으로 읽어 각 단어의 표현을 생성한다.

**Annotation Vector 계산**

`h_j = concat(forward_h_j, backward_h_j)`

여기서 `concat`은 두 벡터를 이어 붙이는 연산이다.

정방향 Hidden State와 역방향 Hidden State를 연결하여 Annotation Vector를 만든다.

이렇게 하면 특정 단어의 표현에 앞뒤 문맥 정보를 함께 반영할 수 있다.

### ② Attention Mechanism

Encoder에서 생성된 모든 Annotation Vector를 보관한다.

Decoder는 새로운 단어를 생성할 때마다 이전 Hidden State와 각 Annotation Vector 사이의 관련성을 계산한다.

이후 Softmax를 통해 Attention Weight를 구하고, 가중합으로 Context Vector를 생성한다.

### ③ RNN Decoder

Decoder는 이전에 생성한 단어, 이전 Hidden State, 현재 Context Vector를 활용하여 다음 단어의 확률분포를 계산한다.

이 과정을 반복하면서 최종 번역 문장을 생성한다.

전체적인 흐름은 다음과 같다.

**Input Sentence**

↓

**Bidirectional RNN Encoder**

↓

**Annotation Vectors (h_1, h_2, ..., h_n)**

↓

**Attention Score → Softmax → Context Vector**

↓

**RNN Decoder**

↓

**Output Word (반복 생성)**

이 구조의 핵심은 **Encoder가 입력 문장의 여러 위치에 대한 표현을 제공하고, Decoder가 매 출력 시점마다 Attention을 통해 필요한 정보를 가져온다는 점**이다.

참고로 이 논문에서 사용한 Attention은 이후 Transformer의 Self-Attention과 동일한 구조는 아니다.

Bahdanau Attention은 RNN 기반 Encoder-Decoder 사이에서 작동하는 Additive Attention이며, Transformer에서는 Query, Key, Value를 이용한 Scaled Dot-Product Attention을 사용한다.

# 3. 예시 및 실험

## 3.1 Attention 계산 예시

Attention이 실제로 어떻게 계산되는지 간단한 숫자로 이해해 보았다.

다음 문장을 번역한다고 가정하자.

**Input: "I love apples"**

Decoder가 "사과를"이라는 단어를 생성하려고 할 때, 입력의 각 단어에 대해 다음과 같은 Attention Score가 계산되었다고 가정한다.

| Input | Attention Score |
| I | 1.0 |
| love | 2.0 |
| apples | 3.0 |

이 값은 논문의 실제 실험 결과가 아니라 개념을 설명하기 위한 임의의 값이다.

Softmax를 적용하면 다음과 같다.

**Softmax 계산 예시**

`alpha_j = exp(score_j) / (exp(1) + exp(2) + exp(3))`

계산 결과는 대략 다음과 같다.

| Input | Attention Weight |
| I | 0.090 |
| love | 0.245 |
| apples | 0.665 |

세 가중치의 합은 1이다.

이를 통해 Decoder가 "사과를"을 생성할 때 "apples"에 가장 높은 가중치를 부여한다는 것을 확인할 수 있다.

이후 각 입력의 Annotation Vector에 해당 가중치를 곱하여 Context Vector를 계산한다.

**Context Vector 계산 예시**

`c_i = 0.090 * h_1 + 0.245 * h_2 + 0.665 * h_3`

이 Context Vector는 다음 단어를 예측하는 과정에 사용된다.

여기서 이해한 중요한 점은 Attention이 입력 데이터 중 하나만 선택하는 과정이 아니라, **관련성에 따라 각 입력 표현을 가중합하는 과정**이라는 것이다.

## 3.2 논문의 실제 실험

논문에서는 제안한 Attention 모델이 기존 Encoder-Decoder보다 좋은 번역 성능을 보이는지 검증했다.

실험에는 WMT 2014 영어-프랑스어 번역 데이터가 사용되었다.

비교 대상은 다음과 같다.

- **RNNencdec:** 기존 고정 길이 벡터 기반 Encoder-Decoder
- **RNNsearch:** 논문에서 제안한 Attention 기반 Encoder-Decoder
- **Moses:** 기존 통계 기반 기계번역 시스템

모델의 성능은 BLEU Score를 이용하여 평가했다.

BLEU는 모델이 생성한 번역문과 정답 번역문 사이의 n-gram 일치 정도 등을 바탕으로 번역 품질을 평가하는 지표다. 일반적으로 점수가 높을수록 참조 번역과의 일치도가 높다.

### 실험 결과

논문 Table 1의 주요 결과를 정리하면 다음과 같다.

| Model | BLEU (전체 문장) | BLEU (No UNK) |
| RNNencdec-30 | 13.93 | 24.19 |
| RNNsearch-30 | 21.50 | 31.44 |
| RNNencdec-50 | 17.82 | 26.71 |
| RNNsearch-50 | 26.75 | 34.16 |
| RNNsearch-50* | 28.45 | 36.15 |
| Moses | 33.30 | 35.63 |

여기서 30과 50은 학습에 사용한 문장의 최대 길이를 의미하며, RNNsearch-50*는 더 오래 학습한 모델이다.

No UNK는 미등록 단어가 없는 문장만을 대상으로 평가한 결과다.

실험 결과에서 주목할 점은 다음과 같다.

### 첫째, Attention을 적용한 모델이 기존 Encoder-Decoder보다 높은 성능을 보였다.

예를 들어 전체 문장 기준으로 RNNencdec-50은 17.82 BLEU를 기록했지만, RNNsearch-50은 26.75 BLEU를 기록했다.

동일한 최대 학습 문장 길이 조건에서 약 8.93 BLEU의 차이가 나타났다.

### 둘째, 긴 문장에서도 Attention의 장점이 나타났다.

논문의 Figure 2에서는 문장 길이에 따른 번역 성능을 비교한다.

기존 Encoder-Decoder는 문장이 길어질수록 성능이 크게 떨어지는 경향을 보인 반면, Attention 모델은 상대적으로 성능을 잘 유지했다.

이는 입력 문장 전체를 하나의 고정 길이 벡터에 압축하지 않고, 필요한 위치의 정보를 참고하도록 한 구조가 효과적이었음을 보여준다.

### 셋째, Attention 모델은 기존 통계 기반 번역 시스템과 경쟁할 수 있는 성능을 보였다.

더 오래 학습한 RNNsearch-50*는 No UNK 조건에서 Moses보다 높은 점수를 기록했다.

다만 전체 문장 기준에서는 Moses의 BLEU 점수가 더 높았다. 따라서 모든 조건에서 기존 통계 기반 시스템을 뛰어넘었다고 해석해서는 안 된다.

## 3.3 Alignment 시각화

논문에서는 Attention Weight를 시각화하여 입력 단어와 출력 단어 사이의 대응 관계도 분석했다.

가로축과 세로축에 각각 입력과 출력 단어를 배치하고, 각 위치의 Attention Weight를 색상으로 표현하면 모델이 어떤 입력 부분을 참고했는지 확인할 수 있다.

이러한 시각화에서는 번역에 관련된 단어들 사이에 높은 Attention Weight가 나타나는 패턴을 관찰할 수 있었다.

이를 통해 Attention이 단순히 번역 성능을 높이는 것뿐 아니라, 모델이 학습한 입력과 출력 사이의 관계를 분석하는 데도 활용될 수 있다는 점을 알 수 있다.

단, Attention Weight가 높다는 사실만으로 해당 단어가 예측 결과의 유일한 원인이라고 단정할 수는 없다.

## 3.4 논문을 읽고 이해한 점

이번 논문을 통해 Attention이 등장한 배경을 이해할 수 있었다.

기존 Encoder-Decoder에서는 입력 문장의 모든 정보를 고정된 크기의 벡터로 표현해야 했다.

하지만 Attention은 Decoder가 출력 단어를 생성할 때마다 입력의 각 위치에 서로 다른 가중치를 부여하고, 이를 이용해 Context Vector를 계산하도록 했다.

이로 인해 입력 문장의 길이가 길어져도 필요한 정보를 보다 효과적으로 활용할 수 있었다.

가장 인상적이었던 점은 Attention이 복잡한 규칙을 사람이 직접 지정하는 방식이 아니라, 신경망이 학습 과정에서 입력과 출력 사이의 관련성을 자동으로 학습한다는 것이다.

또한 이전에 공부한 Transformer의 Attention과 비교하면서, **Attention이라는 아이디어가 RNN 기반 기계번역 모델의 한계를 해결하기 위한 시도에서 발전했다**는 흐름을 이해할 수 있었다.

앞으로는 Bahdanau Attention과 Transformer의 Self-Attention을 비교하면서 두 구조의 차이점을 더 공부하고 싶다.

# 4. 참고자료

1. **Bahdanau, D., Cho, K., & Bengio, Y. (2015).** Neural Machine Translation by Jointly Learning to Align and Translate. International Conference on Learning Representations (ICLR).  
   https://arxiv.org/abs/1409.0473

2. **논문 PDF (ICLR 2015)**  
   https://cs224d.stanford.edu/papers/neural_machine.pdf

3. **Vaswani, A., et al. (2017).** Attention Is All You Need. Advances in Neural Information Processing Systems (NeurIPS).  
   https://arxiv.org/abs/1706.03762

4. **PyTorch Tutorials — NLP From Scratch: Translation with a Sequence to Sequence Network and Attention**  
   https://docs.pytorch.org/tutorials/intermediate/seq2seq_translation_tutorial.html
