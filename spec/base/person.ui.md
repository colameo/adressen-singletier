# Form: Person

The form of `Person`, proposed by `pisa propose-specs` from the domain model. The Salt mockup below is
the layout `pisa generate` renders: reorder the lines, group them in boxes, side by side in one line,
or change the labels. Every field of the model must appear exactly once.

```plantuml
@startsalt
<style>
saltDiagram {
  BackgroundColor #F8F9FA
  FontName "Helvetica"
  FontSize 14
  FontColor #212529
}
</style>
{
  <back:#212529><color:#FFFFFF><size:16>  Home   </size></color><color:#FFFFFF><b>Persons</b></color><color:#ADB5BD>   </color><color:#ADB5BD>Companies</color><color:#ADB5BD>                                  </color><color:#FFFFFF>[ ☰ ]  </color></back>
  .
  <size:22><b>Persons</b></size>
  .
  {+
    <size:16><b>New Person</b></size>
    {^" "
      <b>First Name</b> <color:#DC3545>*</color> | "firstName               "
      <b>Last Name</b> <color:#DC3545>*</color> | "lastName                "
      <b>Email</b> | "email                   "
      <b>Phone</b> | "phone                   "
      <b>Birthday</b> | { "birthday                " | <&calendar> }
      <b>Status</b> <color:#DC3545>*</color> | ^status^
      <b>Street</b> <color:#DC3545>*</color> | "address.street          "
      <b>Zip</b> <color:#DC3545>*</color> | "address.zip             "
      <b>City</b> <color:#DC3545>*</color> | "address.city            "
      <b>Company</b> | ^company^
    }
    { [<color:#FFFFFF><back:#0D6EFD>  Create  </back></color>] | [<color:#6C757D>  Save  </color>] | [<color:#6C757D>  Cancel  </color>] }
  }
  .
  {#
    <back:#E9ECEF><b>Id</b></back> | <back:#E9ECEF><b>First Name</b></back> | <back:#E9ECEF><b>Last Name</b></back> | <back:#E9ECEF><b>Email</b></back> | <back:#E9ECEF><b>Phone</b></back> | <back:#E9ECEF>    </back>
    1 | First Name 1 | Last Name 1 | Email 1 | Phone 1 | <color:#0D6EFD>[Edit]</color> <color:#DC3545>[Delete]</color>
    2 | First Name 2 | Last Name 2 | Email 2 | Phone 2 | <color:#0D6EFD>[Edit]</color> <color:#DC3545>[Delete]</color>
  }
  <size:12><color:#6C757D>[Previous]  Page 1 of 1 (2 entries)  [Next]</color></size>
}
@endsalt
```
