# Attack Descriptor System

This document defines how to represent attack ranges, areas of effect, and positioning for Node-based abilities. Each tile represents a 5x5 meter area.

---

## Basic Range Notation

### Distance Units
- **Tiles (T)**: Primary unit. Each tile = 5x5 meters (25 m²)
- **Meters (m)**: Secondary reference for clarity
- **Self**: Affects only the user
- **Touch**: Adjacent tile (1T = 5m)

### Range Examples
- `Range: 3T` = 15 meters maximum distance
- `Range: Self` = Only affects the caster
- `Range: Touch` = Must be adjacent (5m)

---

## Visual Grid Representation

### Grid Symbols
- **[o]**: User/Origin position
- **[x]**: Area of impact/effect
- **[ ]**: Empty/unaffected tile
- **[?]**: Optional target area (can be placed within range)

### Basic Visual Examples

#### **Melee Attack (5m/1T Range)**
```
[o][x]
```

#### **Sword Slash (Adjacent enemies)**
```
[x][x][x]
[x][o][x]
[x][x][x]
```

#### **Spear Thrust (15m/3T Range)**
```
[o][x][x][x]
```

#### **Cone Attack (10m/2T Range, 90°)**
```
[ ][ ][x]
[o][x][x]
[ ][ ][x]
```

#### **Fireball (20m range, 10m radius)**
Target placement within range:
```
[ ][ ][ ][ ][x][ ][ ]
[ ][ ][ ][x][x][x][ ]
[o][ ][x][x][x][x][x]
[ ][ ][ ][x][x][x][ ]
[ ][ ][ ][ ][x][ ][ ]
```

---

## Area of Effect (AoE) Patterns

### Basic Shapes

#### **Point/Single Target**
- **Notation**: `AoE: Single`
- **Visual**: `[o][x]` or `[o]→[x]` (ranged)
- **Description**: Affects one target or tile
- **Example**: A precise sword thrust

#### **Line**
- **Notation**: `AoE: Line (Length x Width)`
- **Visual Examples**: 
  - 3T Line: `[o][x][x][x]`
  - 2T Wide Line:
    ```
    [o][x][x]
    [ ][x][x]
    ```
- **Description**: Straight line from origin point

#### **Cone**
- **Notation**: `AoE: Cone (Range, Arc)`
- **Visual Examples**:
  - 2T, 90° Cone:
    ```
    [ ][x][x]
    [x][o][x]
    [ ][x][x]
    ```
  - 3T, 45° Cone:
    ```
    [ ][ ][ ][x]
    [ ][ ][x][x]
    [o][x][x][ ]
    ```
- **Description**: Expanding triangular area from caster

#### **Circle/Radius**
- **Notation**: `AoE: Circle (Radius)`
- **Visual Examples**:
  - 1T Circle:
    ```
    [x][x][x]
    [x][o][x]
    [x][x][x]
    ```
  - 2T Circle:
    ```
    [ ][x][x][x][ ]
    [x][x][x][x][x]
    [x][x][o][x][x]
    [x][x][x][x][x]
    [ ][x][x][x][ ]
    ```
- **Description**: Circular area around a point

#### **Square**
- **Notation**: `AoE: Square (Side Length)`
- **Visual Examples**:
  - 3T Square:
    ```
    [x][x][x]
    [x][o][x]
    [x][x][x]
    ```
  - 5T Square:
    ```
    [x][x][x][x][x]
    [x][x][x][x][x]
    [x][x][o][x][x]
    [x][x][x][x][x]
    [x][x][x][x][x]
    ```
- **Description**: Square area centered on a point

#### **Rectangle**
- **Notation**: `AoE: Rectangle (Length x Width)`
- **Visual Example** (4T x 2T):
```
[x][x][x][x]
[o][x][x][x]
```
- **Description**: Rectangular area

---

## Advanced Patterns

### **Ring/Donut**
- **Notation**: `AoE: Ring (Inner Radius - Outer Radius)`
- **Visual Example** (1T - 2T Ring):
```
[ ][x][x][x][ ]
[x][x][ ][x][x]
[x][ ][o][ ][x]
[x][x][ ][x][x]
[ ][x][x][x][ ]
```
- **Description**: Ring-shaped area with hollow center

### **Cross/Plus**
- **Notation**: `AoE: Cross (Arm Length)`
- **Visual Example** (2T Cross):
```
[ ][ ][x][ ][ ]
[ ][ ][x][ ][ ]
[x][x][o][x][x]
[ ][ ][x][ ][ ]
[ ][ ][x][ ][ ]
```
- **Description**: Plus-shaped pattern centered on caster

### **Arc**
- **Notation**: `AoE: Arc (Radius, Arc Degrees)`
- **Visual Example** (2T, 180° Arc):
```
[x][x][x][x][x]
[x][x][x][x][x]
[ ][ ][o][ ][ ]
```
- **Description**: Curved area around caster

---

## Targeting and Origin

### Origin Point Options
- **Self**: Effect originates from the caster's position
- **Target**: Effect originates from a selected target
- **Point**: Effect originates from a chosen location within range

### Targeting Examples
- `Range: 4T, AoE: Circle (2T), Origin: Point`
  - Can place a 10m radius explosion anywhere within 20m
  ```
  [ ][ ][ ][?][x][x]
  [ ][ ][ ][x][x][x]
  [ ][o][ ][x][x][x]
  [ ][ ][ ][x][x][x]
  [ ][ ][ ][ ][x][ ]
  ```
- `Range: Self, AoE: Cone (3T, 60°)`
  - 15m cone extending directly from caster
  ```
  [ ][ ][x][x]
  [ ][x][x][x]
  [x][o][x][ ]
  ```

---

## Complete Attack Examples

### **[Flame Burst] (Tier 3)**
- **Range**: 6T (30m)
- **AoE**: Circle (2T) - 10m radius
- **Origin**: Point
- **Visual**:
```
[ ][ ][ ][ ][ ][?][x][x]
[ ][ ][ ][ ][x][x][x][x]
[ ][ ][o][ ][x][x][x][x]
[ ][ ][ ][ ][x][x][x][x]
[ ][ ][ ][ ][ ][x][x][ ]
```
- **Description**: Create a fiery explosion at any point within 30 meters, affecting a 10-meter radius.

### **[Lightning Spear] (Tier 2)**
- **Range**: 8T (40m)
- **AoE**: Line (8T x 1T) - 40m long, 5m wide
- **Origin**: Self
- **Visual**:
```
[o][x][x][x][x][x][x][x][x]
```
- **Description**: Launch a bolt of lightning in a straight line up to 40 meters.

### **[Whirlwind Strike] (Tier 4)**
- **Range**: Self
- **AoE**: Ring (1T - 3T) - 5m to 15m radius ring
- **Origin**: Self
- **Visual**:
```
[ ][ ][x][x][x][x][x][ ][ ]
[ ][x][x][x][x][x][x][x][ ]
[x][x][x][ ][ ][ ][x][x][x]
[x][x][ ][ ][o][ ][ ][x][x]
[x][x][x][ ][ ][ ][x][x][x]
[ ][x][x][x][x][x][x][x][ ]
[ ][ ][x][x][x][x][x][ ][ ]
```
- **Description**: Spin with weapon extended, hitting all enemies in a ring around you while avoiding close allies.

### **[Cone of Frost] (Tier 2)**
- **Range**: Self
- **AoE**: Cone (4T, 90°) - 20m range, 90-degree arc
- **Origin**: Self
- **Visual**:
```
[ ][ ][ ][x][x][x][x][x]
[ ][ ][x][x][x][x][x][x]
[ ][x][x][x][x][x][x][ ]
[x][x][o][x][x][x][ ][ ]
[ ][x][x][x][x][x][x][ ]
[ ][ ][x][x][x][x][x][x]
[ ][ ][ ][x][x][x][x][x]
```
- **Description**: Breathe freezing air in a wide cone in front of you.

### **[Precise Shot] (Tier 1)**
- **Range**: 12T (60m)
- **AoE**: Single
- **Origin**: Self
- **Visual**:
```
[o]→→→→→→→→→→→→[x]
```
- **Description**: A carefully aimed ranged attack against a single target.

---