### API

```java
//获取上周的今天
DateTime sameDayLastWeek = today.minusWeeks(1);

//上周的周一
DateTime mondayLastWeek = sameDayLastWeek.withDayOfWeek(DateTimeConstants.MONDAY);
//上周的周日
DateTime sundayLastWeek = sameDayLastWeek.withDayOfWeek(DateTimeConstants.SUNDAY);
```
