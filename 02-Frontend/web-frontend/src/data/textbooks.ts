// 人教版教材目录数据（2024最新版，适用于陕西西安）
// 数据来源：人教社2024秋版教材目录，基于联网搜索确认
// 学段 → 课本 → 章节（ → 小节）结构
// 注：高中物理已补录"小节"层级（人教版2019版）；其他科目/初中物理暂只到"章"级

export interface TextbookSection {
  id: string;
  title: string;
}

export interface TextbookChapter {
  id: string;
  title: string;
  // 可选：章下小节。当前仅高中物理补录，未补录的章节不展示小节选择器
  sections?: TextbookSection[];
}

export interface Textbook {
  id: string;
  title: string;
  chapters: TextbookChapter[];
}

export interface SubjectTextbook {
  stage: '初中' | '高中';
  textbooks: Textbook[];
}

// 初中英语教材目录（人教版2024版）
const JUNIOR_ENGLISH: Textbook[] = [
  {
    id: '7s',
    title: '七年级上册',
    chapters: [
      { id: 's1', title: 'Starter Unit 1 Hello!' },
      { id: 's2', title: 'Starter Unit 2 Keep Tidy!' },
      { id: 's3', title: 'Starter Unit 3 Welcome!' },
      { id: 'u1', title: 'Unit 1 You and Me' },
      { id: 'u2', title: "Unit 2 We're Family!" },
      { id: 'u3', title: 'Unit 3 My School' },
      { id: 'u4', title: 'Unit 4 My Favourite Subject' },
      { id: 'u5', title: 'Unit 5 Fun Clubs' },
      { id: 'u6', title: 'Unit 6 A Day in the Life' },
      { id: 'u7', title: 'Unit 7 Happy Birthday!' },
    ],
  },
  {
    id: '7x',
    title: '七年级下册',
    chapters: [
      { id: 'u1', title: 'Unit 1 Animal Friends' },
      { id: 'u2', title: 'Unit 2 No Rules, No Order' },
      { id: 'u3', title: 'Unit 3 Keep Fit' },
      { id: 'u4', title: 'Unit 4 Eat Well' },
      { id: 'u5', title: 'Unit 5 Here and Now' },
      { id: 'u6', title: 'Unit 6 Rain or Shine' },
      { id: 'u7', title: 'Unit 7 A Day to Remember' },
      { id: 'u8', title: 'Unit 8 Once Upon a Time' },
    ],
  },
  {
    id: '8s',
    title: '八年级上册',
    chapters: [
      { id: 'u1', title: 'Unit 1 Happy Holiday' },
      { id: 'u2', title: 'Unit 2 Home Sweet Home' },
      { id: 'u3', title: 'Unit 3 Same or Different' },
      { id: 'u4', title: 'Unit 4 Amazing Plants' },
      { id: 'u5', title: 'Unit 5 What a Delicious Meal' },
      { id: 'u6', title: 'Unit 6 Get Ready' },
      { id: 'u7', title: 'Unit 7 When Tomorrow Comes' },
      { id: 'u8', title: 'Unit 8 Dragons and Heroes' },
    ],
  },
  {
    id: '9',
    title: '九年级全册',
    chapters: [
      { id: 'u1', title: 'Unit 1 How can we become good learners?' },
      { id: 'u2', title: 'Unit 2 I think that mooncakes are delicious!' },
      { id: 'u3', title: 'Unit 3 Could you please tell me where the restrooms are?' },
      { id: 'u4', title: 'Unit 4 I used to be afraid of the dark.' },
      { id: 'u5', title: 'Unit 5 What are the shirts made of?' },
      { id: 'u6', title: 'Unit 6 When was it invented?' },
      { id: 'u7', title: 'Unit 7 Teenagers should be allowed to choose their own clothes.' },
      { id: 'u8', title: 'Unit 8 It must belong to Carla.' },
      { id: 'u9', title: 'Unit 9 I like music that I can dance to.' },
      { id: 'u10', title: 'Unit 10 You are supposed to shake hands.' },
      { id: 'u11', title: 'Unit 11 Sad movies make me cry.' },
      { id: 'u12', title: 'Unit 12 Life is full of the unexpected.' },
    ],
  },
];

// 高中英语教材目录（人教版2019版，2024最新印次）
const SENIOR_ENGLISH: Textbook[] = [
  {
    id: 'bx1',
    title: '必修第一册',
    chapters: [
      { id: 'u1', title: 'Unit 1 Teenage Life' },
      { id: 'u2', title: 'Unit 2 Travelling Around' },
      { id: 'u3', title: 'Unit 3 Sports and Fitness' },
      { id: 'u4', title: 'Unit 4 Natural Disasters' },
      { id: 'u5', title: 'Unit 5 Languages Around the World' },
    ],
  },
  {
    id: 'bx2',
    title: '必修第二册',
    chapters: [
      { id: 'u1', title: 'Unit 1 Cultural Heritage' },
      { id: 'u2', title: 'Unit 2 Wildlife Protection' },
      { id: 'u3', title: 'Unit 3 The Internet' },
      { id: 'u4', title: 'Unit 4 History and Traditions' },
      { id: 'u5', title: 'Unit 5 Music' },
    ],
  },
  {
    id: 'bx3',
    title: '必修第三册',
    chapters: [
      { id: 'u1', title: 'Unit 1 Festivals and Celebrations' },
      { id: 'u2', title: 'Unit 2 Morals and Virtues' },
      { id: 'u3', title: 'Unit 3 Diverse Cultures' },
      { id: 'u4', title: 'Unit 4 Space Exploration' },
      { id: 'u5', title: 'Unit 5 The Value of Money' },
    ],
  },
  {
    id: 'xxb1',
    title: '选择性必修第一册',
    chapters: [
      { id: 'u1', title: 'Unit 1 People of Achievement' },
      { id: 'u2', title: 'Unit 2 Looking into the Future' },
      { id: 'u3', title: 'Unit 3 Fascinating Parks' },
      { id: 'u4', title: 'Unit 4 Body Language' },
      { id: 'u5', title: 'Unit 5 Working the Land' },
    ],
  },
  {
    id: 'xxb2',
    title: '选择性必修第二册',
    chapters: [
      { id: 'u1', title: 'Unit 1 Science and Scientists' },
      { id: 'u2', title: 'Unit 2 Bridging Cultures' },
      { id: 'u3', title: 'Unit 3 Food and Culture' },
      { id: 'u4', title: 'Unit 4 Journey Across a Vast Land' },
      { id: 'u5', title: 'Unit 5 First Aid' },
    ],
  },
  {
    id: 'xxb3',
    title: '选择性必修第三册',
    chapters: [
      { id: 'u1', title: 'Unit 1 Art' },
      { id: 'u2', title: 'Unit 2 Healthy Lifestyle' },
      { id: 'u3', title: 'Unit 3 Environmental Protection' },
      { id: 'u4', title: 'Unit 4 Adversity and Courage' },
      { id: 'u5', title: 'Unit 5 Poems' },
    ],
  },
];

// 初中物理教材目录（人教版2024版）
const JUNIOR_PHYSICS: Textbook[] = [
  {
    id: '8s',
    title: '八年级上册',
    chapters: [
      { id: 'c1', title: '第一章 机械运动' },
      { id: 'c2', title: '第二章 声现象' },
      { id: 'c3', title: '第三章 物态变化' },
      { id: 'c4', title: '第四章 光现象' },
      { id: 'c5', title: '第五章 透镜及其应用' },
      { id: 'c6', title: '第六章 质量和密度' },
    ],
  },
  {
    id: '8x',
    title: '八年级下册',
    chapters: [
      { id: 'c7', title: '第七章 力' },
      { id: 'c8', title: '第八章 运动和力' },
      { id: 'c9', title: '第九章 压强' },
      { id: 'c10', title: '第十章 浮力' },
      { id: 'c11', title: '第十一章 功和机械能' },
      { id: 'c12', title: '第十二章 简单机械' },
    ],
  },
  {
    id: '9',
    title: '九年级全册',
    chapters: [
      { id: 'c13', title: '第十三章 内能' },
      { id: 'c14', title: '第十四章 内能的利用' },
      { id: 'c15', title: '第十五章 电流和电路' },
      { id: 'c16', title: '第十六章 电压 电阻' },
      { id: 'c17', title: '第十七章 欧姆定律' },
      { id: 'c18', title: '第十八章 电功率' },
      { id: 'c19', title: '第十九章 生活用电' },
      { id: 'c20', title: '第二十章 电与磁' },
      { id: 'c21', title: '第二十一章 信息的传递' },
      { id: 'c22', title: '第二十二章 能源与可持续发展' },
    ],
  },
];

// 高中物理教材目录（人教版2019版，2024最新印次）—— 已补录各章小节
const SENIOR_PHYSICS: Textbook[] = [
  {
    id: 'bx1',
    title: '必修第一册',
    chapters: [
      {
        id: 'c1',
        title: '第一章 运动的描述',
        sections: [
          { id: 'c1-s1', title: '1. 质点 参考系' },
          { id: 'c1-s2', title: '2. 时间 位移' },
          { id: 'c1-s3', title: '3. 位置变化快慢的描述——速度' },
          { id: 'c1-s4', title: '4. 实验：用打点计时器测速度' },
          { id: 'c1-s5', title: '5. 速度变化快慢的描述——加速度' },
        ],
      },
      {
        id: 'c2',
        title: '第二章 匀变速直线运动的研究',
        sections: [
          { id: 'c2-s1', title: '1. 实验：探究小车速度随时间变化的规律' },
          { id: 'c2-s2', title: '2. 匀变速直线运动的速度与时间的关系' },
          { id: 'c2-s3', title: '3. 匀变速直线运动的位移与时间的关系' },
          { id: 'c2-s4', title: '4. 自由落体运动' },
        ],
      },
      {
        id: 'c3',
        title: '第三章 相互作用——力',
        sections: [
          { id: 'c3-s1', title: '1. 重力与弹力' },
          { id: 'c3-s2', title: '2. 摩擦力' },
          { id: 'c3-s3', title: '3. 牛顿第三定律' },
          { id: 'c3-s4', title: '4. 力的合成和分解' },
          { id: 'c3-s5', title: '5. 共点力的平衡' },
        ],
      },
      {
        id: 'c4',
        title: '第四章 运动和力的关系',
        sections: [
          { id: 'c4-s1', title: '1. 牛顿第一定律' },
          { id: 'c4-s2', title: '2. 实验：探究加速度与力、质量的关系' },
          { id: 'c4-s3', title: '3. 牛顿第二定律' },
          { id: 'c4-s4', title: '4. 力学单位制' },
          { id: 'c4-s5', title: '5. 牛顿运动定律的应用' },
          { id: 'c4-s6', title: '6. 超重和失重' },
        ],
      },
    ],
  },
  {
    id: 'bx2',
    title: '必修第二册',
    chapters: [
      {
        id: 'c5',
        title: '第五章 抛体运动',
        sections: [
          { id: 'c5-s1', title: '1. 曲线运动' },
          { id: 'c5-s2', title: '2. 运动的合成与分解' },
          { id: 'c5-s3', title: '3. 实验：探究平抛运动的特点' },
          { id: 'c5-s4', title: '4. 抛体运动的规律' },
        ],
      },
      {
        id: 'c6',
        title: '第六章 圆周运动',
        sections: [
          { id: 'c6-s1', title: '1. 圆周运动' },
          { id: 'c6-s2', title: '2. 向心加速度' },
          { id: 'c6-s3', title: '3. 向心力' },
          { id: 'c6-s4', title: '4. 生活中的圆周运动' },
        ],
      },
      {
        id: 'c7',
        title: '第七章 万有引力与宇宙航行',
        sections: [
          { id: 'c7-s1', title: '1. 行星的运动' },
          { id: 'c7-s2', title: '2. 万有引力定律' },
          { id: 'c7-s3', title: '3. 万有引力理论的成就' },
          { id: 'c7-s4', title: '4. 宇宙航行' },
          { id: 'c7-s5', title: '5. 相对论时空观与牛顿力学的局限性' },
        ],
      },
      {
        id: 'c8',
        title: '第八章 机械能守恒定律',
        sections: [
          { id: 'c8-s1', title: '1. 功与功率' },
          { id: 'c8-s2', title: '2. 重力势能' },
          { id: 'c8-s3', title: '3. 动能和动能定理' },
          { id: 'c8-s4', title: '4. 机械能守恒定律' },
          { id: 'c8-s5', title: '5. 实验：验证机械能守恒定律' },
        ],
      },
    ],
  },
  {
    id: 'bx3',
    title: '必修第三册',
    chapters: [
      {
        id: 'c9',
        title: '第九章 静电场及其应用',
        sections: [
          { id: 'c9-s1', title: '1. 电荷' },
          { id: 'c9-s2', title: '2. 库仑定律' },
          { id: 'c9-s3', title: '3. 电场 电场强度' },
          { id: 'c9-s4', title: '4. 静电的防止与利用' },
        ],
      },
      {
        id: 'c10',
        title: '第十章 静电场中的能量',
        sections: [
          { id: 'c10-s1', title: '1. 电势能和电势' },
          { id: 'c10-s2', title: '2. 电势差' },
          { id: 'c10-s3', title: '3. 电势差与电场强度的关系' },
          { id: 'c10-s4', title: '4. 电容器的电容' },
          { id: 'c10-s5', title: '5. 带电粒子在电场中的运动' },
        ],
      },
      {
        id: 'c11',
        title: '第十一章 电路及其应用',
        sections: [
          { id: 'c11-s1', title: '1. 电源和电流' },
          { id: 'c11-s2', title: '2. 导体的电阻' },
          { id: 'c11-s3', title: '3. 实验：导体电阻率的测量' },
          { id: 'c11-s4', title: '4. 串联电路和并联电路' },
        ],
      },
      {
        id: 'c12',
        title: '第十二章 电能 能量守恒定律',
        sections: [
          { id: 'c12-s1', title: '1. 电路中的能量转化' },
          { id: 'c12-s2', title: '2. 闭合电路的欧姆定律' },
          { id: 'c12-s3', title: '3. 实验：电池电动势和内阻的测量' },
          { id: 'c12-s4', title: '4. 能源与可持续发展' },
        ],
      },
      {
        id: 'c13',
        title: '第十三章 电磁感应与电磁波初步',
        sections: [
          { id: 'c13-s1', title: '1. 磁场 磁感线' },
          { id: 'c13-s2', title: '2. 磁感应强度 磁通量' },
          { id: 'c13-s3', title: '3. 电磁感应现象及应用' },
          { id: 'c13-s4', title: '4. 电磁波' },
          { id: 'c13-s5', title: '5. 能量量子化' },
        ],
      },
    ],
  },
  {
    id: 'xxb1',
    title: '选择性必修第一册',
    chapters: [
      {
        id: 'c1',
        title: '第一章 动量守恒定律',
        sections: [
          { id: 'c1-s1', title: '1. 动量' },
          { id: 'c1-s2', title: '2. 动量定理' },
          { id: 'c1-s3', title: '3. 动量守恒定律' },
          { id: 'c1-s4', title: '4. 实验：验证动量守恒定律' },
          { id: 'c1-s5', title: '5. 弹性碰撞和非弹性碰撞' },
          { id: 'c1-s6', title: '6. 反冲现象 火箭' },
        ],
      },
      {
        id: 'c2',
        title: '第二章 机械振动',
        sections: [
          { id: 'c2-s1', title: '1. 简谐运动' },
          { id: 'c2-s2', title: '2. 简谐运动的描述' },
          { id: 'c2-s3', title: '3. 简谐运动的回复力和能量' },
          { id: 'c2-s4', title: '4. 单摆' },
          { id: 'c2-s5', title: '5. 实验：用单摆测量重力加速度' },
          { id: 'c2-s6', title: '6. 阻尼振动 受迫振动' },
        ],
      },
      {
        id: 'c3',
        title: '第三章 机械波',
        sections: [
          { id: 'c3-s1', title: '1. 波的形成' },
          { id: 'c3-s2', title: '2. 波的描述' },
          { id: 'c3-s3', title: '3. 波的反射、折射和衍射' },
          { id: 'c3-s4', title: '4. 波的干涉' },
          { id: 'c3-s5', title: '5. 多普勒效应' },
        ],
      },
      {
        id: 'c4',
        title: '第四章 光',
        sections: [
          { id: 'c4-s1', title: '1. 光的折射' },
          { id: 'c4-s2', title: '2. 全反射' },
          { id: 'c4-s3', title: '3. 光的干涉' },
          { id: 'c4-s4', title: '4. 实验：用双缝干涉测量光的波长' },
          { id: 'c4-s5', title: '5. 光的衍射' },
          { id: 'c4-s6', title: '6. 光的偏振' },
        ],
      },
    ],
  },
  {
    id: 'xxb2',
    title: '选择性必修第二册',
    chapters: [
      {
        id: 'c1',
        title: '第一章 安培力与洛伦兹力',
        sections: [
          { id: 'c1-s1', title: '1. 磁场对通电导线的作用力' },
          { id: 'c1-s2', title: '2. 磁场对运动电荷的作用力' },
          { id: 'c1-s3', title: '3. 带电粒子在匀强磁场中的运动' },
          { id: 'c1-s4', title: '4. 质谱仪与回旋加速器' },
        ],
      },
      {
        id: 'c2',
        title: '第二章 电磁感应',
        sections: [
          { id: 'c2-s1', title: '1. 楞次定律' },
          { id: 'c2-s2', title: '2. 法拉第电磁感应定律' },
          { id: 'c2-s3', title: '3. 涡流 电磁阻尼和电磁驱动' },
          { id: 'c2-s4', title: '4. 互感和自感' },
        ],
      },
      {
        id: 'c3',
        title: '第三章 交变电流',
        sections: [
          { id: 'c3-s1', title: '1. 交变电流' },
          { id: 'c3-s2', title: '2. 交变电流的描述' },
          { id: 'c3-s3', title: '3. 变压器' },
          { id: 'c3-s4', title: '4. 电能的输送' },
        ],
      },
      {
        id: 'c4',
        title: '第四章 电磁振荡与电磁波',
        sections: [
          { id: 'c4-s1', title: '1. 电磁振荡' },
          { id: 'c4-s2', title: '2. 电磁场与电磁波' },
          { id: 'c4-s3', title: '3. 无线电波的发射和接收' },
          { id: 'c4-s4', title: '4. 电磁波谱' },
        ],
      },
      {
        id: 'c5',
        title: '第五章 传感器',
        sections: [
          { id: 'c5-s1', title: '1. 认识传感器' },
          { id: 'c5-s2', title: '2. 常见传感器的工作原理及应用' },
          { id: 'c5-s3', title: '3. 利用传感器制作简单的自动控制装置' },
        ],
      },
    ],
  },
  {
    id: 'xxb3',
    title: '选择性必修第三册',
    chapters: [
      {
        id: 'c1',
        title: '第一章 分子动理论',
        sections: [
          { id: 'c1-s1', title: '1. 分子动理论的基本内容' },
          { id: 'c1-s2', title: '2. 实验：用油膜法估测油酸分子的大小' },
          { id: 'c1-s3', title: '3. 分子运动速率分布规律' },
          { id: 'c1-s4', title: '4. 分子动能和分子势能' },
        ],
      },
      {
        id: 'c2',
        title: '第二章 气体 固体 液体',
        sections: [
          { id: 'c2-s1', title: '1. 温度和温标' },
          { id: 'c2-s2', title: '2. 气体的等温变化' },
          { id: 'c2-s3', title: '3. 气体的等压变化和等容变化' },
          { id: 'c2-s4', title: '4. 理想气体状态方程' },
          { id: 'c2-s5', title: '5. 固体' },
          { id: 'c2-s6', title: '6. 液体' },
        ],
      },
      {
        id: 'c3',
        title: '第三章 热力学定律',
        sections: [
          { id: 'c3-s1', title: '1. 功能关系与能量守恒定律' },
          { id: 'c3-s2', title: '2. 热力学第一定律' },
          { id: 'c3-s3', title: '3. 能量守恒定律' },
          { id: 'c3-s4', title: '4. 热力学第二定律' },
          { id: 'c3-s5', title: '5. 热力学第二定律的微观解释' },
          { id: 'c3-s6', title: '6. 能源和可持续发展' },
        ],
      },
      {
        id: 'c4',
        title: '第四章 原子结构和波粒二象性',
        sections: [
          { id: 'c4-s1', title: '1. 普朗克黑体辐射的提出' },
          { id: 'c4-s2', title: '2. 光电效应' },
          { id: 'c4-s3', title: '3. 原子结构' },
          { id: 'c4-s4', title: '4. 氢原子光谱 玻尔原子理论' },
          { id: 'c4-s5', title: '5. 粒子的波动性' },
        ],
      },
      {
        id: 'c5',
        title: '第五章 原子核',
        sections: [
          { id: 'c5-s1', title: '1. 原子核的组成' },
          { id: 'c5-s2', title: '2. 原子核衰变' },
          { id: 'c5-s3', title: '3. 结合能' },
          { id: 'c5-s4', title: '4. 核裂变与核聚变' },
          { id: 'c5-s5', title: '5. 核反应结合能' },
        ],
      },
    ],
  },
];

// 科目 → 教材目录映射
export const TEXTBOOK_DATA: Record<string, SubjectTextbook[]> = {
  英语: [
    { stage: '初中', textbooks: JUNIOR_ENGLISH },
    { stage: '高中', textbooks: SENIOR_ENGLISH },
  ],
  物理: [
    { stage: '初中', textbooks: JUNIOR_PHYSICS },
    { stage: '高中', textbooks: SENIOR_PHYSICS },
  ],
};

// 获取指定科目的所有学段
export function getStages(subject: string): string[] {
  const data = TEXTBOOK_DATA[subject];
  if (!data) return [];
  return data.map(item => item.stage);
}

// 获取指定科目、学段的所有课本
export function getTextbooks(subject: string, stage: string): Textbook[] {
  const data = TEXTBOOK_DATA[subject];
  if (!data) return [];
  const stageData = data.find(item => item.stage === stage);
  return stageData ? stageData.textbooks : [];
}

// 获取指定课本的所有章节
export function getChapters(subject: string, stage: string, textbookId: string): TextbookChapter[] {
  const textbooks = getTextbooks(subject, stage);
  const textbook = textbooks.find(t => t.id === textbookId);
  return textbook ? textbook.chapters : [];
}
